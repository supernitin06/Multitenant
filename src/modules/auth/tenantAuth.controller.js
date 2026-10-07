import bcrypt from "bcryptjs";
import { sendServerError } from "../../core/utils/serverError.js";
import jwt from "jsonwebtoken";
import prisma from "../../core/config/db.js";
import { buildSession } from "./session.js";
import { getAllDomainsInSubscription } from "../admin/subscription/subscription.and.Domain.controller.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
};

/**
 * Find a tenant by the value used in the URL (username or name, case-insensitive).
 */
export const findTenantBySlug = (slug) =>
  prisma.tenant.findFirst({
    where: {
      OR: [
        { tenantUsername: { equals: slug, mode: "insensitive" } },
        { tenantName: { equals: slug, mode: "insensitive" } },
      ],
    },
  });

const recordAttempt = (data) =>
  prisma.loginAttempt.create({ data }).catch((err) => console.error("[LOGIN_ATTEMPT_FAILED]", err.message));

/**
 * POST /api/v1/tenant/:tenantName/login
 * Body: { email, password }
 *
 * Login for people who work inside a tenant: staff members first, then users.
 * (The tenant admin account logs in with POST /api/v1/auth/tenant/login.)
 */
export const loginTenantMember = async (req, res) => {
  try {
    const { tenantName } = req.params;
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const tenant = await findTenantBySlug(tenantName);
    if (!tenant) {
      return res.status(404).json({ success: false, message: `Organisation "${tenantName}" was not found` });
    }

    const meta = {
      tenantId: tenant.id,
      email,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    };

    // 1. Staff member of this tenant?
    let account = await prisma.tenantStaff.findFirst({
      where: { tenantId: tenant.id, email: { equals: email, mode: "insensitive" } },
    });
    let type = "TENANT_STAFF";
    let model = prisma.tenantStaff;
    let actorFields = { actorType: "TENANT_STAFF", tenantStaffId: account?.id };

    // 2. Otherwise a user of this tenant?
    if (!account) {
      account = await prisma.user.findFirst({
        where: { tenantId: tenant.id, email: { equals: email, mode: "insensitive" } },
      });
      type = "USER";
      model = prisma.user;
      actorFields = { actorType: "TENANT_USER", userId: account?.id };
    }

    if (!account) {
      await recordAttempt({ ...meta, actorType: "TENANT_USER", success: false, reason: "UNKNOWN_EMAIL" });
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!account.isActive) {
      await recordAttempt({ ...meta, ...actorFields, success: false, reason: "INACTIVE" });
      return res.status(403).json({ success: false, message: "Your account is disabled. Contact your administrator." });
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      return res.status(423).json({ success: false, message: "Too many failed attempts. Try again in a few minutes." });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      const failed = (account.failedLoginCount || 0) + 1;
      await model.update({
        where: { id: account.id },
        data: {
          failedLoginCount: failed >= MAX_FAILED_LOGINS ? 0 : failed,
          lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
        },
      });
      await recordAttempt({ ...meta, ...actorFields, success: false, reason: "WRONG_PASSWORD" });
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    await model.update({
      where: { id: account.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        ...(type === "TENANT_STAFF" ? { lastLogin: new Date() } : {}),
      },
    });
    await recordAttempt({ ...meta, ...actorFields, success: true });

    const token = jwt.sign(
      { userId: account.id, tenantId: tenant.id, type },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    setAuthCookie(res, token);

    // Build the same session shape as GET /auth/me
    const role = account.roleId
      ? await prisma.tenantRole.findUnique({ where: { id: account.roleId }, select: { name: true, power: true } })
      : null;
    const user = await buildSession({
      id: account.id,
      type,
      tenantId: tenant.id,
      email: account.email,
      name: account.name,
      roleId: account.roleId,
      role: role?.name || null,
      power: role?.power ?? 0,
    });

    res.json({ success: true, message: "Login successful", token, user });
  } catch (error) {
    console.error("Tenant member login error:", error);
    sendServerError(res, error, "Login failed");
  }
};

/**
 * GET /api/v1/tenant/:tenantName/plan/domains
 * Feature domains (and their features) included in the caller's own plan.
 * Drives the tenant sidebar.
 */
export const getMyPlanDomains = async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.user.tenantId },
    select: { subscription_planId: true },
  });
  if (!tenant?.subscription_planId) {
    return res.json({ success: true, count: 0, domains: [] });
  }
  // Express 5 makes req.query read-only, so pass a request view with our own planId
  const scopedReq = Object.create(req, { query: { value: { planId: tenant.subscription_planId } } });
  return getAllDomainsInSubscription(scopedReq, res);
};

/**
 * GET /api/v1/tenant/:tenantName/plan/history
 * Subscription history of the caller's own tenant.
 */
export const getMyPlanHistory = async (req, res) => {
  try {
    const tenantPlanHistory = await prisma.tenantPlanHistory.findMany({
      where: { tenant_id: req.user.tenantId },
      orderBy: { assigned_at: "desc" },
    });
    res.json({ success: true, tenantPlanHistory });
  } catch (error) {
    console.error("Plan history error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch plan history" });
  }
};
