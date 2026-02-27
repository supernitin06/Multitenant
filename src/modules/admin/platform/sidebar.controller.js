import prisma from "../../../core/config/db.js";
import logger from "../../../core/utils/logger.js";
import { writeAuditLog } from "../../../platform/audit/audit.helper.js";

/**
 * Create Platform Sidebar Item
 */
export const createSidebar = async (req, res) => {
    try {
        const { name } = req.body;

        if (!req.user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const actorUserId = req.user.id;
        const actorType = req.user.type; // "SUPER_ADMIN" or "PLATFORM_MANAGEMENT"

        // if (actorType !== "SUPER_ADMIN" && actorType !== "PLATFORM_STAFF") {
        //     return res.status(403).json({ success: false, message: "Only Super Admin or Platform Staff can perform this action" });
        // }

        if (!name) {
            return res.status(400).json({ success: false, message: "Sidebar name is required" });
        }

        const existing = await prisma.platformSidebar.findFirst({
            where: { name: { equals: name, mode: "insensitive" } }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "Sidebar item already exists" });
        }

        const sidebar = await prisma.platformSidebar.create({
            data: { name }
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_SIDEBAR_CREATED",
            entity: "PLATFORM_SIDEBAR",
            entityId: sidebar.id,
            meta: { name },
            req
        });

        res.status(201).json({ success: true, sidebar });

    } catch (error) {
        logger.error(`[createSidebar] error: ${error.message}`, error);
        res.status(500).json({
            success: false,
            message: "Failed to create sidebar item",
            error: error.message,
            stack: error.stack
        });
    }
};

/**
 * List All Platform Sidebar Items
 */
export const listSidebars = async (req, res) => {
    try {
        const sidebars = await prisma.platformSidebar.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                assignToRole: {
                    include: {
                        platformRole: true
                    }
                }
            }
        });
        res.json({ success: true, sidebars });
    } catch (error) {
        logger.error(`[listSidebars] error: ${error.message}`, error);
        res.status(500).json({ success: false, message: "Failed to list sidebar items" });
    }
};

/**
 * Assign Sidebar Item to a Platform Role
 * Body: { roleId, sidebarId }
 */
export const assignSidebarToRole = async (req, res) => {
    try {
        const { roleId, sidebarId } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        if (actorType !== "SUPER_ADMIN" && actorType !== "PLATFORM_STAFF") {
            return res.status(403).json({ success: false, message: "Only Super Admin or Platform Staff can perform this action" });
        }

        if (!roleId || !sidebarId) {
            return res.status(400).json({ success: false, message: "roleId and sidebarId are required" });
        }

        // Validate Role
        const role = await prisma.platformRole.findUnique({
            where: { id: roleId }
        });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        // Validate Sidebar
        const sidebar = await prisma.platformSidebar.findUnique({
            where: { id: sidebarId }
        });
        if (!sidebar) {
            return res.status(404).json({ success: false, message: "Sidebar item not found" });
        }

        // Check if already assigned
        const existingAssignment = await prisma.platformSidebarAssignToRole.findFirst({
            where: {
                roleId,
                platformSidebarId: sidebarId
            }
        });

        if (existingAssignment) {
            return res.status(400).json({ success: false, message: "Sidebar item already assigned to this role" });
        }

        // Create assignment
        await prisma.platformSidebarAssignToRole.create({
            data: {
                roleId,
                platformSidebarId: sidebarId
            }
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_SIDEBAR_ASSIGNED",
            entity: "PLATFORM_ROLE",
            entityId: roleId,
            meta: { sidebarId },
            req
        });

        res.json({ success: true, message: "Sidebar item assigned successfully" });

    } catch (error) {
        logger.error(`[assignSidebarToRole] error: ${error.message}`, error);
        res.status(500).json({ success: false, message: "Failed to assign sidebar item" });
    }
};

export const unassignSidebarFromRole = async (req, res) => {
    try {
        const { roleId, sidebarId } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        if (actorType !== "SUPER_ADMIN" && actorType !== "PLATFORM_STAFF") {
            return res.status(403).json({ success: false, message: "Only Super Admin or Platform Staff can perform this action" });
        }

        if (!roleId || !sidebarId) {
            return res.status(400).json({ success: false, message: "roleId and sidebarId are required" });
        }

        // Validate Role
        const role = await prisma.platformRole.findUnique({
            where: { id: roleId }
        });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        // Validate Sidebar
        const sidebar = await prisma.platformSidebar.findUnique({
            where: { id: sidebarId }
        });
        if (!sidebar) {
            return res.status(404).json({ success: false, message: "Sidebar item not found" });
        }

        // Check if already assigned
        const existingAssignment = await prisma.platformSidebarAssignToRole.findFirst({
            where: {
                roleId,
                platformSidebarId: sidebarId
            }
        });

        if (!existingAssignment) {
            return res.status(400).json({ success: false, message: "Sidebar item not assigned to this role" });
        }

        // Create assignment
        await prisma.platformSidebarAssignToRole.delete({
            where: {
                id: existingAssignment.id
            }
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_SIDEBAR_UNASSIGNED",
            entity: "PLATFORM_ROLE",
            entityId: roleId,
            meta: { sidebarId },
            req
        });

        res.json({ success: true, message: "Sidebar item unassigned successfully" });

    } catch (error) {
        logger.error(`[unassignSidebarFromRole] error: ${error.message}`, error);
        res.status(500).json({ success: false, message: "Failed to unassign sidebar item" });
    }
};


/**
 * Get Sidebar Items Assigned to a Role
 **/
export const getRoleSidebars = async (req, res) => {
    try {
        const { roleId } = req.params;

        const role = await prisma.platformRole.findUnique({
            where: { id: roleId }
        });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        // Start with finding the assignments
        const assignments = await prisma.platformSidebarAssignToRole.findMany({
            where: { roleId },
            select: { platformSidebarId: true } // We only have the ID, no relation setup in schema shown
        });

        const sidebarIds = assignments.map(a => a.platformSidebarId);

        let sidebars = [];
        if (sidebarIds.length > 0) {
            sidebars = await prisma.platformSidebar.findMany({
                where: { id: { in: sidebarIds } }
            });
        }

        res.json({ success: true, sidebars });

    } catch (error) {
        logger.error(`[getRoleSidebars] error: ${error.message}`, error);
        res.status(500).json({ success: false, message: "Failed to fetch role sidebars" });
    }
};
