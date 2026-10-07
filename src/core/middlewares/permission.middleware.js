import prisma from "../config/db.js";
import {
  getCachedPermissions,
  setCachedPermissions
} from "../cache/permission.cache.js";

/**
 * RBAC guards. See core/constants/permissions.js for the catalog and the
 * meaning of each actor type.
 *
 *  requirePlatformPermission(KEY)  → Super Admin panel routes
 *  requireTenantPermission(KEY)    → routes that act inside one tenant
 */

const PLATFORM_ACTORS = new Set(["SUPER_ADMIN", "PLATFORM_STAFF"]);
const TENANT_ACTORS = new Set(["TENANT", "TENANT_STAFF", "USER"]);

/**
 * Load (and cache) the permission keys granted to a role.
 * scope: "platform" | "tenant"
 */
export const getRolePermissionKeys = async (scope, roleId) => {
  if (!roleId) return new Set();

  const cacheKey = `${scope}:${roleId}`;
  const cached = getCachedPermissions(cacheKey);
  if (cached) return cached;

  const rows = scope === "platform"
    ? await prisma.platformRolePermission.findMany({ where: { roleId }, include: { permission: true } })
    : await prisma.tenantRolePermission.findMany({ where: { roleId }, include: { permission: true } });

  const keys = rows.map((rp) => rp.permission.key);
  setCachedPermissions(cacheKey, keys);
  return new Set(keys);
};

/**
 * Effective permission keys for the logged-in actor.
 * Returns ["*"] for actors that bypass checks in their own scope
 * (SUPER_ADMIN on the platform, TENANT admin inside its tenant).
 */
export const getEffectivePermissions = async (user) => {
  if (!user) return [];
  if (user.type === "SUPER_ADMIN" || user.type === "TENANT") return ["*"];
  if (user.type === "PLATFORM_STAFF") return [...await getRolePermissionKeys("platform", user.roleId)];
  if (user.type === "TENANT_STAFF" || user.type === "USER") return [...await getRolePermissionKeys("tenant", user.roleId)];
  return [];
};

const deny = (res, status, message) => res.status(status).json({ success: false, message });

const describe = async (scope, key) => {
  if (scope === "platform") {
    const def = await prisma.platformPermission.findUnique({ where: { key }, select: { description: true } });
    return def?.description || key;
  }
  const def = await prisma.tenantPermission.findUnique({ where: { key }, select: { name: true } });
  return def?.name || key;
};

/**
 * Guard for Super Admin panel routes.
 * SUPER_ADMIN → always allowed. PLATFORM_STAFF → needs KEY on their role.
 * Tenant-side actors are always rejected.
 */
export const requirePlatformPermission = (permissionKey) => async (req, res, next) => {
  try {
    const { type, roleId } = req.user || {};

    if (!PLATFORM_ACTORS.has(type)) {
      return deny(res, 403, "This action is only available to platform administrators.");
    }
    if (type === "SUPER_ADMIN") return next();

    if (!roleId) return deny(res, 403, "No role is assigned to your account.");

    const permissions = await getRolePermissionKeys("platform", roleId);
    if (permissions.has(permissionKey)) return next();

    return deny(res, 403, `Your role is not allowed to: ${await describe("platform", permissionKey)}`);
  } catch (err) {
    console.error("Platform permission check failed:", err);
    return deny(res, 500, "Permission validation failed");
  }
};

/**
 * Guard for routes that act inside a tenant.
 * TENANT (tenant admin) → always allowed. TENANT_STAFF / USER → needs KEY on their tenant role.
 * Platform actors are rejected because they have no tenant context.
 */
export const requireTenantPermission = (permissionKey) => async (req, res, next) => {
  try {
    const { type, roleId, tenantId } = req.user || {};

    if (!TENANT_ACTORS.has(type) || !tenantId) {
      return deny(res, 403, "This action must be performed from inside a tenant account.");
    }
    if (type === "TENANT") return next();

    if (!roleId) return deny(res, 403, "No role is assigned to your account.");

    const permissions = await getRolePermissionKeys("tenant", roleId);
    if (permissions.has(permissionKey)) return next();

    return deny(res, 403, `Your role is not allowed to: ${await describe("tenant", permissionKey)}`);
  } catch (err) {
    console.error("Tenant permission check failed:", err);
    return deny(res, 500, "Permission validation failed");
  }
};
