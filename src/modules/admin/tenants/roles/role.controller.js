import prisma from "../../../../core/config/db.js";
import logger from "../../../../core/utils/logger.js";
import { writeAuditLog, auditActor } from "../../../../platform/audit/audit.helper.js";
import { clearRoleCache } from "../../../../core/cache/permission.cache.js";

/**
 * Role hierarchy inside a tenant
 * ─────────────────────────────
 * Every tenant role has a `power` (1-99). The tenant admin account is 100.
 * A tenant staff member / user may only create, edit or delete roles whose
 * power is strictly LOWER than their own role's power. The tenant admin can
 * manage every role in its tenant.
 */
const TENANT_ADMIN_POWER = 100;

const requesterPower = (user) =>
  user.type === "TENANT" ? TENANT_ADMIN_POWER : (user.power ?? 0);

const normaliseName = (name) => String(name).trim().replace(/\s+/g, " ").toUpperCase();

const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { staffs: true, users: true } },
};

/**
 * Keep the per-tenant levelPower registry in sync (used by reports).
 */
const syncLevelPower = async (tx, tenantId, roleName, power) => {
  const existing = await tx.levelPower.findFirst({ where: { tenantId, role: roleName } });
  if (existing) {
    if (existing.power !== power) {
      await tx.levelPower.update({ where: { id: existing.id }, data: { power } });
    }
    return;
  }
  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { tenantName: true } });
  await tx.levelPower.create({
    data: { tenantId, tenantName: tenant?.tenantName || "Unknown", role: roleName, power },
  });
};

/**
 * Create tenant role
 */
export const createTenantRole = async (req, res) => {
  try {
    const { name, power, permissionIds } = req.body;
    const tenantId = req.user.tenantId;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const roleName = normaliseName(name);
    const requestedPower = power !== undefined && power !== "" ? parseInt(power, 10) : 10;
    const myPower = requesterPower(req.user);

    if (Number.isNaN(requestedPower) || requestedPower < 1 || requestedPower >= TENANT_ADMIN_POWER) {
      return res.status(400).json({ success: false, message: "Power must be a number between 1 and 99" });
    }
    if (requestedPower >= myPower) {
      return res.status(403).json({
        success: false,
        message: `You can only create roles with a power lower than your own (${myPower}).`,
      });
    }

    const duplicate = await prisma.tenantRole.findFirst({ where: { tenantId, name: roleName } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: `A role named "${roleName}" already exists` });
    }

    const role = await prisma.$transaction(async (tx) => {
      await syncLevelPower(tx, tenantId, roleName, requestedPower);
      const created = await tx.tenantRole.create({
        data: { name: roleName, power: requestedPower, tenantId },
      });
      if (Array.isArray(permissionIds) && permissionIds.length) {
        await tx.tenantRolePermission.createMany({
          data: [...new Set(permissionIds)].map((permissionId) => ({ roleId: created.id, permissionId })),
          skipDuplicates: true,
        });
      }
      return tx.tenantRole.findUnique({ where: { id: created.id }, include: roleInclude });
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: "TENANT_ROLE_CREATED",
      entity: "TENANT_ROLE",
      entityId: role.id,
      meta: { name: roleName, power: requestedPower },
      req,
    });

    res.status(201).json({ success: true, message: "Role created", role });
  } catch (err) {
    logger.error(`[createTenantRole] error: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to create role" });
  }
};

/**
 * List tenant roles (highest power first)
 */
export const getTenantRoles = async (req, res) => {
  try {
    const roles = await prisma.tenantRole.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { power: "desc" },
      include: roleInclude,
    });

    res.json({ success: true, roles });
  } catch (err) {
    logger.error(`[getTenantRoles] error: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to fetch roles" });
  }
};

/**
 * Get one tenant role
 */
export const getTenantRoleById = async (req, res) => {
  try {
    const role = await prisma.tenantRole.findFirst({
      where: { id: req.params.roleId, tenantId: req.user.tenantId },
      include: roleInclude,
    });

    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, role });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch role" });
  }
};

/**
 * Update tenant role (name / power)
 */
export const updateTenantRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, power } = req.body;
    const tenantId = req.user.tenantId;

    const role = await prisma.tenantRole.findFirst({ where: { id: roleId, tenantId } });
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    const myPower = requesterPower(req.user);
    const newPower = power !== undefined && power !== "" ? parseInt(power, 10) : role.power;
    const newName = name ? normaliseName(name) : role.name;

    if (Number.isNaN(newPower) || newPower < 1 || newPower >= TENANT_ADMIN_POWER) {
      return res.status(400).json({ success: false, message: "Power must be a number between 1 and 99" });
    }
    if (req.user.type !== "TENANT") {
      if (role.power >= myPower) {
        return res.status(403).json({ success: false, message: "You cannot edit a role at or above your own level." });
      }
      if (newPower >= myPower) {
        return res.status(403).json({ success: false, message: "You cannot raise a role to your own level or higher." });
      }
    }

    if (newName !== role.name) {
      const duplicate = await prisma.tenantRole.findFirst({ where: { tenantId, name: newName } });
      if (duplicate) return res.status(409).json({ success: false, message: `A role named "${newName}" already exists` });
    }

    const updatedRole = await prisma.$transaction(async (tx) => {
      await syncLevelPower(tx, tenantId, newName, newPower);
      const updated = await tx.tenantRole.update({
        where: { id: roleId },
        data: { name: newName, power: newPower },
        include: roleInclude,
      });
      // Keep the cached power of staff on this role in sync
      await tx.tenantStaff.updateMany({ where: { roleId }, data: { power: newPower } });
      return updated;
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: "TENANT_ROLE_UPDATED",
      entity: "TENANT_ROLE",
      entityId: roleId,
      meta: { name: newName, power: newPower },
      req,
    });

    res.json({ success: true, message: "Role updated", role: updatedRole });
  } catch (err) {
    logger.error(`[updateTenantRole] error: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};

/**
 * Delete tenant role
 * Refuses while staff members are still assigned to it.
 */
export const deleteTenantRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const tenantId = req.user.tenantId;

    const role = await prisma.tenantRole.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { staffs: true, users: true } } },
    });
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    if (req.user.type !== "TENANT" && role.power >= requesterPower(req.user)) {
      return res.status(403).json({ success: false, message: "You cannot delete a role at or above your own level." });
    }

    if (role._count.staffs > 0 || role._count.users > 0) {
      return res.status(409).json({
        success: false,
        message: `Move the ${role._count.staffs} staff member(s) and ${role._count.users} user(s) to another role before deleting "${role.name}".`,
      });
    }

    await prisma.tenantRole.delete({ where: { id: roleId } });
    clearRoleCache(roleId);

    await writeAuditLog({
      ...auditActor(req.user),
      action: "TENANT_ROLE_DELETED",
      entity: "TENANT_ROLE",
      entityId: roleId,
      meta: { name: role.name },
      req,
    });

    res.json({ success: true, message: "Role deleted" });
  } catch (err) {
    logger.error(`[deleteTenantRole] error: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to delete role" });
  }
};
