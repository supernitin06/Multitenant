import prisma from "../../../core/config/db.js";
import logger from "../../../core/utils/logger.js";
import { writeAuditLog } from "../../../platform/audit/audit.helper.js";

/**
 * Get internal level for the platform requester
 */
const getPlatformRequesterLevel = async (user) => {
    try {
        if (user.type === "SUPER_ADMIN") {
            const admin = await prisma.superAdmin.findUnique({
                where: { id: user.id },
                select: { power: true }
            });
            return admin?.power ?? 1000;
        }

        if (user.type === "PLATFORM_MANAGEMENT") {
            const staff = await prisma.platform_staff.findUnique({
                where: { id: user.id },
                select: { power: true }
            });
            return staff?.power ?? 0;
        }
    } catch (error) {
        logger.error("Error in getPlatformRequesterLevel:", error);
    }
    return 0;
};

/**
 * Create Platform Role
 */
export const createPlatformRole = async (req, res) => {
    try {
        let { name, power, description } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Role name required"
            });
        }

        // ✅ 1️⃣ Convert to CAPITAL & trim
        name = name.trim().toUpperCase();

        // ✅ 2️⃣ Check duplicate (case-insensitive)
        const existingRole = await prisma.platformRole.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive", // important
                },
            },
        });

        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: "Role already exists",
            });
        }

        const requestedPower = power !== undefined ? parseInt(power) : 10;
        const myLevel = await getPlatformRequesterLevel(req.user);

       

        if (actorType !== "SUPER_ADMIN" && requestedPower >= myLevel) {
            return res.status(403).json({
                success: false,
                message: `Not authorized: You can only create roles with power lower than your own (${myLevel}).`,
            });
        }

        // ✅ 3️⃣ Create role
        const role = await prisma.platformRole.create({
            data: {
                name,
                power: requestedPower,
                description
            },
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_ROLE_CREATED",
            entity: "PLATFORM_ROLE",
            entityId: role.id,
            meta: { name, power: requestedPower },
            req,
        });

        res.status(201).json({ success: true, role });

    } catch (err) {
        logger.error(`[createPlatformRole] error: ${err.message}`, err);
        res.status(500).json({
            success: false,
            message: "Failed to create platform role"
        });
    }
};


/**
 * List Platform Roles
 */
export const listPlatformRoles = async (req, res) => {
    try {
        const roles = await prisma.platformRole.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            },
            orderBy: { power: "desc" }
        });

        res.json({ success: true, roles });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch platform roles" });
    }
};

/**
 * Update Platform Role
 */
export const updatePlatformRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, power, description } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        const role = await prisma.platformRole.findUnique({ where: { id } });
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });

        const myLevel = await getPlatformRequesterLevel(req.user);
        const newPower = power !== undefined ? parseInt(power) : role.power;

        if (actorType !== "SUPER_ADMIN") {
            if (myLevel <= role.power) {
                return res.status(403).json({ success: false, message: "Cannot update role of equal or higher authority." });
            }
            if (newPower >= myLevel) {
                return res.status(403).json({ success: false, message: "Cannot promote role to your level or higher." });
            }
        }

        const updatedRole = await prisma.platformRole.update({
            where: { id },
            data: { name, power: newPower, description },
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_ROLE_UPDATED",
            entity: "PLATFORM_ROLE",
            entityId: id,
            meta: { name, power: newPower },
            req,
        });

        res.json({ success: true, role: updatedRole });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update platform role" });
    }
};

/**
 * Delete Platform Role
 */
export const deletePlatformRole = async (req, res) => {
    try {
        const { id } = req.params;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        const role = await prisma.platformRole.findUnique({ where: { id } });
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });

        const myLevel = await getPlatformRequesterLevel(req.user);
        if (actorType !== "SUPER_ADMIN" && myLevel <= role.power) {
            return res.status(403).json({ success: false, message: "Cannot delete role of equal or higher authority." });
        }

        await prisma.platformRole.delete({ where: { id } });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_ROLE_DELETED",
            entity: "PLATFORM_ROLE",
            entityId: id,
            req,
        });

        res.json({ success: true, message: "Role deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete platform role" });
    }
};
