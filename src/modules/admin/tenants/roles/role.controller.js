import prisma from "../../../../core/config/db.js";
import logger from "../../../../core/utils/logger.js";
import { writeAuditLog } from "../../../../platform/audit/audit.helper.js";
import { AUDIT_ACTIONS } from "../../../../platform/audit/audit.constants.js";
import { clearRoleCache } from "../../../../core/cache/permission.cache.js";

// 🏆 AUTHORITY LEVELS

/**
 * Get internal level for the requester
 */
const getRequesterLevel = async (user) => {
  try {
    if (user.type === "SUPER_ADMIN") {
      const admin = await prisma.superAdmin.findUnique({
        where: { id: user.id },
        select: { power: true }
      });
      return admin?.power ? parseInt(admin.power) : 1000;
    }

    if (user.type === "TENANT") {
      const lp = await prisma.levelPower.findFirst({
        where: { tenantId: user.id, role: "TENANT_ADMIN" },
        select: { power: true }
      });
      return lp?.power ? parseInt(lp.power) : 100;
    }

    if (user.type === "TENANT_STAFF") {
      const staff = await prisma.tenantStaff.findUnique({
        where: { id: user.id },
        select: { power: true }
      });
      return staff?.power ?? 0;
    }

    // For regular users with assigned roles
    if (user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { role: true },
      });
      if (dbUser && dbUser.role) {
        return dbUser.role.power || 0;
      }
    }
  } catch (error) {
    logger.error("Error in getRequesterLevel:", error);
  }

  return 0;
};

/**
 * TENANT ADMIN
 * Create tenant role
 */
export const createTenantRole = async (req, res) => {
  try {
    const { name, power } = req.body;
    const tenantId = req.user.tenantId;
    const actorUserId = req.user.id;

    logger.info(
      `[createTenantRole] start actorUser=${actorUserId} tenant=${tenantId} name=${name}`
    );

    const requestedPower = power !== undefined ? parseInt(power) : 10;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Role name required",
      });
    }

    // 🔒 HIERARCHY CHECK
    const myLevel = await getRequesterLevel(req.user);

    if (requestedPower >= myLevel) {
      return res.status(403).json({
        success: false,
        message: `Not authorized: You can only create roles with power lower than your own (${myLevel}).`,
      });
    }

    const role = await prisma.$transaction(async (tx) => {
      const existingLP = await tx.levelPower.findFirst({
        where: { tenantId, role: name }
      });

      if (existingLP) {
        if (requestedPower !== existingLP.power) {
          throw new Error(`This role name is already registered with power ${existingLP.power}.`);
        }
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { tenantName: true } });
        await tx.levelPower.create({
          data: {
            tenantId,
            tenantName: tenant?.tenantName || "Unknown",
            role: name,
            power: requestedPower,
          }
        });
      }

      return await tx.tenantRole.create({
        data: {
          name,
          power: requestedPower,
          tenantId,
        },
      });
    });

    await writeAuditLog({
      actorType: req.user.type === "TENANT" ? "TENANT_USER" : "TENANT_STAFF",
      [req.user.type === "TENANT" ? "userId" : "tenantStaffId"]: actorUserId,
      tenantId,
      action: "TENANT_ROLE_CREATED",
      entity: "TENANT_ROLE",
      entityId: role.id,
      meta: { name, power: requestedPower },
      req,
    });

    res.status(201).json({ success: true, role });
  } catch (err) {
    logger.error(`[createTenantRole] error: ${err.message}`, err);
    res.status(500).json({ success: false, message: err.message || "Failed to create role" });
  }
};

/**
 * TENANT ADMIN
 * Get all tenant roles
 */
export const getTenantRoles = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const roles = await prisma.tenantRole.findMany({
      where: { tenantId },
      orderBy: { power: "desc" },
      include: {
        permissions: {
          include: {
            permission: true
          },
        },
      },
    });

    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch roles" });
  }
};

/**
 * TENANT ADMIN
 * Update Tenant Role
 */
export const updateTenantRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, power } = req.body;
    const tenantId = req.user.tenantId;
    const actorUserId = req.user.id;

    const role = await prisma.tenantRole.findFirst({ where: { id: roleId, tenantId } });
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    const myLevel = await getRequesterLevel(req.user);
    const newPower = power !== undefined ? parseInt(power) : role.power;

    if (myLevel <= role.power && req.user.type !== "SUPER_ADMIN" && req.user.type !== "TENANT") {
      return res.status(403).json({ success: false, message: "Cannot update role of equal or higher authority." });
    }

    if (newPower >= myLevel && req.user.type !== "SUPER_ADMIN" && req.user.type !== "TENANT") {
      return res.status(403).json({ success: false, message: "Cannot promote role to your level or higher." });
    }

    const updatedRole = await prisma.tenantRole.update({
      where: { id: roleId },
      data: { name, power: newPower },
    });

    await writeAuditLog({
      actorType: req.user.type === "TENANT" ? "TENANT_USER" : "TENANT_STAFF",
      [req.user.type === "TENANT" ? "userId" : "tenantStaffId"]: actorUserId,
      tenantId,
      action: "TENANT_ROLE_UPDATED",
      entity: "TENANT_ROLE",
      entityId: roleId,
      meta: { name, power: newPower },
      req,
    });

    res.json({ success: true, role: updatedRole });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};

/**
 * TENANT ADMIN
 * Delete Tenant Role
 */
export const deleteTenantRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const tenantId = req.user.tenantId;
    const actorUserId = req.user.id;

    const role = await prisma.tenantRole.findFirst({ where: { id: roleId, tenantId } });
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    const myLevel = await getRequesterLevel(req.user);
    if (myLevel <= role.power && req.user.type !== "SUPER_ADMIN" && req.user.type !== "TENANT") {
      return res.status(403).json({ success: false, message: "Cannot delete role of equal or higher authority." });
    }

    await prisma.tenantRole.delete({ where: { id: roleId } });

    await writeAuditLog({
      actorType: req.user.type === "TENANT" ? "TENANT_USER" : "TENANT_STAFF",
      [req.user.type === "TENANT" ? "userId" : "tenantStaffId"]: actorUserId,
      tenantId,
      action: "TENANT_ROLE_DELETED",
      entity: "TENANT_ROLE",
      entityId: roleId,
      req,
    });

    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete role" });
  }
};

/**
 * TENANT ADMIN
 * Get tenant role by ID
 */
export const getTenantRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;
    const tenantId = req.user.tenantId;

    const role = await prisma.tenantRole.findFirst({
      where: { id: roleId, tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, role });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch role" });
  }
};



