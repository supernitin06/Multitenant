import { Router } from "express";
import {
    listTenantGroupedPermissions,
    createTenantPermission,
    updateTenantPermission,
    deleteTenantPermission,
} from "./permission.controller.js";
import {
    listTenantPermissionDomains,
    createTenantPermissionDomain,
    updateTenantPermissionDomain,
    deleteTenantPermissionDomain
} from "./permission_domain.controller.js";
import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../../core/middlewares/permission.middleware.js";

/**
 * Tenant permission CATALOG — managed by the platform (Super Admin panel).
 * Mounted at /api/v1/super-admin/tenant-permissions
 *
 * These are the permissions every tenant can hand out to its own roles.
 */
const router = Router();

router.use(authMiddleware);

router.get("/", requirePlatformPermission("VIEW_TENANT_PERMISSION_CATALOG"), listTenantGroupedPermissions);
router.post("/", requirePlatformPermission("MANAGE_TENANT_PERMISSION_CATALOG"), createTenantPermission);
router.put("/:id", requirePlatformPermission("MANAGE_TENANT_PERMISSION_CATALOG"), updateTenantPermission);
router.delete("/:id", requirePlatformPermission("MANAGE_TENANT_PERMISSION_CATALOG"), deleteTenantPermission);

router.get("/domains/list", requirePlatformPermission("VIEW_TENANT_PERMISSION_CATALOG"), listTenantPermissionDomains);
router.post("/domains", requirePlatformPermission("MANAGE_TENANT_PERMISSION_CATALOG"), createTenantPermissionDomain);
router.put("/domains/:id", requirePlatformPermission("MANAGE_TENANT_PERMISSION_CATALOG"), updateTenantPermissionDomain);
router.delete("/domains/:id", requirePlatformPermission("MANAGE_TENANT_PERMISSION_CATALOG"), deleteTenantPermissionDomain);

export default router;
