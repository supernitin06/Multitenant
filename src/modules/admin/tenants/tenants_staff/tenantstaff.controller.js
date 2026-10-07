import prisma from "../../../../core/config/db.js";
import bcrypt from "bcryptjs";
import { writeAuditLog, auditActor } from "../../../../platform/audit/audit.helper.js";
import logger from "../../../../core/utils/logger.js";

/**
 * Tenant staff = employees of a tenant who log in to the tenant portal.
 * What they can do is decided by their TenantRole (role → permissions).
 * A staff member's `power` always mirrors the power of their role.
 */

const TENANT_ADMIN_POWER = 100;
const requesterPower = (user) => (user.type === "TENANT" ? TENANT_ADMIN_POWER : (user.power ?? 0));

const staffSelect = {
    id: true,
    name: true,
    email: true,
    isActive: true,
    power: true,
    roleId: true,
    role: { select: { id: true, name: true, power: true } },
    lastLogin: true,
    createdAt: true,
};

/**
 * Find a role in this tenant and make sure the requester outranks it.
 * Returns { role } or { error: [status, message] }.
 */
const resolveAssignableRole = async (req, roleId) => {
    const role = await prisma.tenantRole.findFirst({ where: { id: roleId, tenantId: req.user.tenantId } });
    if (!role) return { error: [404, "Role not found in this organisation"] };
    if (req.user.type !== "TENANT" && role.power >= requesterPower(req.user)) {
        return { error: [403, `You can only assign roles below your own level (${requesterPower(req.user)}).`] };
    }
    return { role };
};

/**
 * Create staff member
 * Body: { name, email, password, roleId }
 */
export const registerTenantStaff = async (req, res) => {
    try {
        const { email, password, name, roleId } = req.body;
        const tenantId = req.user.tenantId;

        if (!email || !password || !roleId) {
            return res.status(400).json({ success: false, message: "Email, password and role are required" });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const { role, error } = await resolveAssignableRole(req, roleId);
        if (error) return res.status(error[0]).json({ success: false, message: error[1] });

        const normalisedEmail = String(email).trim().toLowerCase();
        const existing = await prisma.tenantStaff.findFirst({ where: { email: { equals: normalisedEmail, mode: "insensitive" } } });
        if (existing) {
            return res.status(409).json({ success: false, message: "A staff member with this email already exists" });
        }

        const staff = await prisma.tenantStaff.create({
            data: {
                email: normalisedEmail,
                password: await bcrypt.hash(password, 10),
                name,
                roleId: role.id,
                power: role.power,
                tenantId,
            },
            select: staffSelect,
        });

        await writeAuditLog({
            ...auditActor(req.user),
            action: "TENANT_STAFF_CREATED",
            entity: "TENANT_STAFF",
            entityId: staff.id,
            meta: { name: staff.name, email: staff.email, role: role.name },
            req,
        });

        res.status(201).json({ success: true, message: "Staff member created", staff });
    } catch (error) {
        logger.error("Register Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to create staff member" });
    }
};

/**
 * List staff of the current tenant
 */
export const listTenantStaff = async (req, res) => {
    try {
        const staff = await prisma.tenantStaff.findMany({
            where: { tenantId: req.user.tenantId },
            select: staffSelect,
            orderBy: { createdAt: "desc" },
        });

        res.json({ success: true, staff });
    } catch (error) {
        logger.error("List Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch staff" });
    }
};

/**
 * Update staff member
 * Body: { name?, isActive?, password?, roleId? }
 */
export const updateTenantStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive, password, roleId } = req.body;
        const tenantId = req.user.tenantId;

        const staff = await prisma.tenantStaff.findFirst({ where: { id, tenantId } });
        if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

        if (req.user.type !== "TENANT" && staff.power >= requesterPower(req.user)) {
            return res.status(403).json({ success: false, message: "You cannot edit a staff member at or above your own level." });
        }
        if (req.user.type === "TENANT_STAFF" && req.user.id === id && isActive === false) {
            return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive === true || isActive === "true";
        if (password) {
            if (String(password).length < 6) {
                return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
            }
            updateData.password = await bcrypt.hash(password, 10);
            updateData.failedLoginCount = 0;
            updateData.lockedUntil = null;
        }
        if (roleId && roleId !== staff.roleId) {
            const { role, error } = await resolveAssignableRole(req, roleId);
            if (error) return res.status(error[0]).json({ success: false, message: error[1] });
            updateData.roleId = role.id;
            updateData.power = role.power;
        }

        const updatedStaff = await prisma.tenantStaff.update({
            where: { id },
            data: updateData,
            select: staffSelect,
        });

        await writeAuditLog({
            ...auditActor(req.user),
            action: "TENANT_STAFF_UPDATED",
            entity: "TENANT_STAFF",
            entityId: id,
            meta: { updates: Object.keys(updateData).filter((k) => k !== "password") },
            req,
        });

        res.json({ success: true, message: "Staff member updated", staff: updatedStaff });
    } catch (error) {
        logger.error("Update Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to update staff member" });
    }
};

/**
 * Delete staff member
 */
export const deleteTenantStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        const staff = await prisma.tenantStaff.findFirst({ where: { id, tenantId } });
        if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

        if (req.user.type === "TENANT_STAFF" && req.user.id === id) {
            return res.status(400).json({ success: false, message: "You cannot delete your own account" });
        }
        if (req.user.type !== "TENANT" && staff.power >= requesterPower(req.user)) {
            return res.status(403).json({ success: false, message: "You cannot delete a staff member at or above your own level." });
        }

        // Audit rows reference the staff member, so detach them first
        await prisma.$transaction([
            prisma.auditLog.updateMany({ where: { tenantStaffId: id }, data: { tenantStaffId: null } }),
            prisma.loginAttempt.updateMany({ where: { tenantStaffId: id }, data: { tenantStaffId: null } }),
            prisma.tenantStaff.delete({ where: { id } }),
        ]);

        await writeAuditLog({
            ...auditActor(req.user),
            action: "TENANT_STAFF_DELETED",
            entity: "TENANT_STAFF",
            entityId: id,
            meta: { email: staff.email },
            req,
        });

        res.json({ success: true, message: "Staff member deleted" });
    } catch (error) {
        logger.error("Delete Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete staff member" });
    }
};
