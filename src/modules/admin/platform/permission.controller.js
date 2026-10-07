import prisma from "../../../core/config/db.js";
import logger from "../../../core/utils/logger.js";
import { writeAuditLog, auditActor } from "../../../platform/audit/audit.helper.js";
import { clearRoleCache, clearAllPermissionCache } from "../../../core/cache/permission.cache.js";

/**
 * Create Platform Permission
 */
export const createPlatformPermission = async (req, res) => {
    try {
        const { key, description, domainId } = req.body;
        if (!key) return res.status(400).json({ success: false, message: "Name is required" });

        const upperKey = key.trim().toUpperCase().replace(/\s+/g, "_");

        const existing = await prisma.platformPermission.findUnique({ where: { key: upperKey } });
        if (existing) return res.status(409).json({ success: false, message: "Permission Name already exists" });

        const permission = await prisma.platformPermission.create({
            data: {
                key: upperKey,
                description,
                domains: (domainId && Array.isArray(domainId)) ? {
                    create: domainId.map(dId => ({
                        domain: { connect: { id: dId } }
                    }))
                } : undefined
            },
            include: {
                domains: { include: { domain: true } }
            }
        });

        res.status(201).json({ success: true, permission });
    } catch (error) {
        logger.error("Create Platform Permission Error:", error);
        res.status(500).json({ success: false, message: "Failed to create platform permission" });
    }
};

/**
 * Update Platform Permission
 */
export const updatePlatformPermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { key, description, domainId } = req.body;

        const existing = await prisma.platformPermission.findUnique({
            where: { id },
            include: { domains: true }
        });
        if (!existing) return res.status(404).json({ success: false, message: "Platform permission not found" });

        const permission = await prisma.platformPermission.update({
            where: { id },
            data: {
                key: key ? key.trim().toUpperCase().replace(/\s+/g, "_") : undefined,
                description,
                domains: (domainId && Array.isArray(domainId)) ? {
                    deleteMany: {},
                    create: domainId.map(dId => ({
                        domain: { connect: { id: dId } }
                    }))
                } : undefined
            },
            include: {
                domains: { include: { domain: true } }
            }
        });

        clearAllPermissionCache();
        res.json({ success: true, message: "Permission updated successfully", permission });
    } catch (error) {
        logger.error("Update Platform Permission Error:", error);
        res.status(500).json({ success: false, message: "Failed to update platform permission" });
    }
};

/**
 * Delete Platform Permission (also removes it from every role and domain)
 */
export const deletePlatformPermission = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.platformPermission.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ success: false, message: "Platform permission not found" });

        await prisma.platformPermission.delete({ where: { id } });
        clearAllPermissionCache();

        await writeAuditLog({
            ...auditActor(req.user),
            action: "PLATFORM_PERMISSION_DELETED",
            entity: "PLATFORM_PERMISSION",
            entityId: id,
            meta: { key: existing.key },
            req,
        });

        res.json({ success: true, message: "Permission deleted successfully" });
    } catch (error) {
        logger.error("Delete Platform Permission Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete platform permission" });
    }
};

/**
 * Assign Domain to Permission (Manual)
 */
export const assignPermissionsToDomain = async (req, res) => {
    try {
        const { domainId, permissionIds } = req.body;

        if (!domainId || !permissionIds || !Array.isArray(permissionIds)) {
            return res.status(400).json({ success: false, message: "domainId (string) and permissionIds (array) are required" });
        }

        // Transaction to overwrite permissions for this domain
        await prisma.$transaction([
            // 1. Clear existing permissions for this domain
            prisma.platformPermissionDomainMap.deleteMany({
                where: { domainId }
            }),
            // 2. Assign new permissions
            prisma.platformPermissionDomainMap.createMany({
                skipDuplicates: true,
                data: [...new Set(permissionIds)].map(permId => ({
                    domainId,
                    permissionId: permId
                }))
            })
        ]);

        res.json({ success: true, message: "Permissions assigned to domain successfully" });
    } catch (error) {
        logger.error("Assign Permissions To Domain Error:", error);
        res.status(500).json({ success: false, message: "Failed to assign permissions to domain" });
    }
};

/**
 * List Platform Permissions
 */
export const listPlatformPermissions = async (req, res) => {
    try {
        const permissions = await prisma.platformPermission.findMany({
            include: {
                domains: {
                    include: { domain: true }
                }
            },
            orderBy: { key: "asc" }
        });
        res.json({ success: true, permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch platform permissions" });
    }
};

export const listpermissionbyroleId = async (req, res) => {
    try {
        const { roleId } = req.params;
        const permissions = await prisma.platformRolePermission.findMany({
            where: { roleId },
            include: {
                permission: true
            }
        });
        res.json({ success: true, permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch platform permissions" });
    }
};



/**
 * Assign Permissions to Platform Role
 */

export const assignPermissionsToPlatformRole = async (req, res) => {
    try {
        const { permissionId, roleId } = req.body; // Expect single permissionId
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        if (!permissionId || !roleId) return res.status(400).json({ success: false, message: "roleId and permissionId are required" });

        const role = await prisma.platformRole.findUnique({ where: { id: roleId } });
        if (!role) return res.status(404).json({ success: false, message: "Platform role not found" });

        // Staff can only grant permissions to roles below them, and only permissions they hold
        if (actorType !== "SUPER_ADMIN") {
            if ((req.user.power ?? 0) <= role.power) {
                return res.status(403).json({ success: false, message: "You can only change permissions of roles below your own level." });
            }
            const own = await prisma.platformRolePermission.findUnique({
                where: { roleId_permissionId: { roleId: req.user.roleId, permissionId } }
            });
            if (!own) return res.status(403).json({ success: false, message: "You cannot grant a permission you do not have." });
        }

        // Upsert to assign permission (create if not exists, nothing if it does)
        const existingPermission = await prisma.platformRolePermission.findUnique({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId
                }
            }
        });

        if (existingPermission) {
            return res.status(400).json({ success: false, message: "Permission already assigned to role" });
        }



        await prisma.platformRolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId
                }
            },
            create: { roleId, permissionId },
            update: {}
        });

        // 🔥 Invalidate cache so new permissions take effect immediately
        clearRoleCache(roleId);

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_PERMISSION_ASSIGNED",
            entity: "PLATFORM_ROLE",
            entityId: roleId,
            meta: { permissionId },
            req,
        });

        res.json({ success: true, message: "Permission assigned successfully" });
    } catch (error) {
        logger.error("Assign Platform Permission Error:", error);
        res.status(500).json({ success: false, message: "Failed to assign permission" });
    }
};

/**
 * Remove Permission from Platform Role
 */
export const removePermissionFromPlatformRole = async (req, res) => {
    try {
        const { roleId, permissionId } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        // Check if role exists
        const role = await prisma.platformRole.findUnique({ where: { id: roleId } });
        if (!role) return res.status(404).json({ success: false, message: "Platform role not found" });

        if (actorType !== "SUPER_ADMIN" && (req.user.power ?? 0) <= role.power) {
            return res.status(403).json({ success: false, message: "You can only change permissions of roles below your own level." });
        }

        // Delete the permission assignment
        await prisma.platformRolePermission.delete({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId
                }
            }
        });

        // 🔥 Invalidate cache so permissions updates take effect immediately
        clearRoleCache(roleId);

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_PERMISSION_REMOVED",
            entity: "PLATFORM_ROLE",
            entityId: roleId,
            meta: { permissionId },
            req,
        });

        res.json({ success: true, message: "Permission removed from role successfully" });
    } catch (error) {
        // P2025: Record to delete does not exist
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: "Permission not assigned to this role" });
        }
        logger.error("Remove Platform Permission Error:", error);
        res.status(500).json({ success: false, message: "Failed to remove permission from role" });
    }
};

// --------------------------------------------------------------------------------
// Platform Permission Domains
// --------------------------------------------------------------------------------

export const createPlatformPermissionDomain = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Name required" });

        const existing = await prisma.platformPermissionDomain.findUnique({
            where: { name }
        });

        if (existing) {
            return res.status(409).json({ success: false, message: "Permission Domain with this name already exists" });
        }

        const domain = await prisma.platformPermissionDomain.create({
            data: { name, description }
        });
        res.status(201).json({ success: true, domain });
    } catch (error) {
        logger.error("Create Domain Error:", error);
        res.status(500).json({ success: false, message: "Failed to create domain", error: error.message });
    }
};

export const listPlatformPermissionDomains = async (req, res) => {
    try {
        const domains = await prisma.platformPermissionDomain.findMany({
            include: {
                permissions: {
                    include: {
                        permission: {
                            select: {
                                id: true,
                                key: true,
                                description: true
                            }
                        }
                    }
                },
                _count: {
                    select: { permissions: true }
                }
            },
            orderBy: { name: "asc" }
        });

        // Flatten the structure for a cleaner response
        const formattedDomains = domains.map(domain => ({
            ...domain,
            permissions: domain.permissions.map(p => ({
                ...p.permission,
                name: p.permission.key
            }))
        }));

        return res.status(200).json({
            success: true,
            data: formattedDomains
        });

    } catch (error) {
        console.error("List Domain Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const updatePlatformPermissionDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const domain = await prisma.platformPermissionDomain.update({
            where: { id },
            data: { name, description }
        });
        res.json({ success: true, domain });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update domain" });
    }
};

export const deletePlatformPermissionDomain = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if domain has permissions via mapping table - Optional check removed to allow deletion
        // const count = await prisma.platformPermissionDomainMap.count({
        //     where: {
        //         domainId: id
        //     }
        // });

        // if (count > 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Cannot delete domain that has permissions assigned to it"
        //     });
        // }

        await prisma.platformPermissionDomain.delete({ where: { id } });
        res.json({ success: true, message: "Domain deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete domain" });
    }
};
