import prisma from "../../../../core/config/db.js";
import { writeAuditLog } from "../../../../platform/audit/audit.helper.js";

/**
 * SUPER ADMIN
 * Create a new Tenant Permission Domain
 */
export const createTenantPermissionDomain = async (req, res) => {
    try {
        const { name, description } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }

        const domain = await prisma.tenantPermissionDomain.create({
            data: { name, description },
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "TENANT_PERMISSION_DOMAIN_CREATED",
            entity: "TENANT_PERMISSION_DOMAIN",
            entityId: domain.id,
            meta: { name },
            req,
        });

        res.status(201).json({ success: true, domain });
    } catch (error) {
        console.error("Create Tenant Permission Domain Error:", error);
        res.status(500).json({ success: false, message: "Failed to create domain" });
    }
};

/**
 * SUPER ADMIN
 * List all Tenant Permission Domains
 */
export const listTenantPermissionDomains = async (req, res) => {
    try {
        const domains = await prisma.tenantPermissionDomain.findMany({
            include: { _count: { select: { permissions: true } } },
            orderBy: { name: "asc" },
        });
        res.json({ success: true, domains });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch domains" });
    }
};

/**
 * SUPER ADMIN
 * Update Tenant Permission Domain
 */
export const updateTenantPermissionDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        const domain = await prisma.tenantPermissionDomain.update({
            where: { id },
            data: { name, description },
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "TENANT_PERMISSION_DOMAIN_UPDATED",
            entity: "TENANT_PERMISSION_DOMAIN",
            entityId: id,
            meta: { name },
            req,
        });

        res.json({ success: true, domain });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update domain" });
    }
};

/**
 * SUPER ADMIN
 * Delete Tenant Permission Domain
 */
export const deleteTenantPermissionDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        // Check if domain has permissions
        const count = await prisma.tenantPermission.count({
            where: {
                domains: { some: { id } }
            }
        });
        if (count > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete domain that has permissions assigned to it"
            });
        }

        await prisma.tenantPermissionDomain.delete({ where: { id } });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "TENANT_PERMISSION_DOMAIN_DELETED",
            entity: "TENANT_PERMISSION_DOMAIN",
            entityId: id,
            req,
        });

        res.json({ success: true, message: "Domain deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete domain" });
    }
};

