import jwt from "jsonwebtoken";
import { sendServerError } from "../utils/serverError.js";
import prisma from "../config/db.js";

/**
 * Resolves the JWT (cookie `token` or `Authorization: Bearer`) into req.user.
 *
 * req.user always has: { id, type, email, name, role, roleId?, tenantId?, power? }
 *  type = SUPER_ADMIN | PLATFORM_STAFF | TENANT | TENANT_STAFF | USER
 *  role = human readable role name (e.g. "SUPER_ADMIN", "TENANT_ADMIN", "PRINCIPAL")
 */
export const authMiddleware = async (req, res, next) => {
  // An explicit Bearer token wins over the cookie: the admin panel sends Bearer,
  // the tenant app relies on the cookie, and both can share one browser.
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Please log in to continue" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Your session has expired. Please log in again" });
  }

  try {
    if (decoded.type === "SUPER_ADMIN") {
      const admin = await prisma.superAdmin.findUnique({ where: { id: decoded.userId } });
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" });

      req.user = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        power: parseInt(admin.power, 10) || 1000,
        type: "SUPER_ADMIN",
      };
    }
    else if (decoded.type === "PLATFORM_STAFF") {
      const staff = await prisma.platformStaff.findUnique({
        where: { id: decoded.userId },
        include: { role: { select: { id: true, name: true, power: true } } },
      });
      if (!staff || !staff.isActive) {
        return res.status(401).json({ success: false, message: "Staff account is inactive or not found" });
      }

      req.user = {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        roleId: staff.roleId,
        role: staff.role?.name || null,
        power: staff.role?.power ?? staff.power,
        type: "PLATFORM_STAFF",
      };
    }
    else if (decoded.type === "TENANT_STAFF") {
      const staff = await prisma.tenantStaff.findUnique({
        where: { id: decoded.userId },
        include: { role: { select: { id: true, name: true, power: true } } },
      });
      if (!staff || !staff.isActive) {
        return res.status(401).json({ success: false, message: "Staff account is inactive or not found" });
      }

      req.user = {
        id: staff.id,
        tenantId: staff.tenantId,
        email: staff.email,
        name: staff.name,
        roleId: staff.roleId,
        role: staff.role?.name || null,
        power: staff.role?.power ?? staff.power,
        type: "TENANT_STAFF",
      };
    }
    else if (decoded.type === "USER") {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: { select: { id: true, name: true, power: true } } },
      });
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: "User account is inactive or not found" });
      }

      req.user = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        role: user.role?.name || null,
        power: user.role?.power ?? 0,
        type: "USER",
      };
    }
    else if (decoded.type === "TENANT") {
      const tenantId = decoded.tenantId || decoded.userId;
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return res.status(401).json({ success: false, message: "Tenant account not found" });

      req.user = {
        id: tenant.id,
        tenantId: tenant.id,
        email: tenant.tenantEmail,
        name: tenant.tenantName,
        role: tenant.role || "TENANT_ADMIN",
        power: tenant.power ?? 100,
        type: "TENANT",
      };
    }
    else {
      return res.status(401).json({ success: false, message: "Unknown session type" });
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return sendServerError(res, err, "Could not verify your session");
  }
};
