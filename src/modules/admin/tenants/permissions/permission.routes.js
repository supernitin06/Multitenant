import { Router } from "express";
import {
    listTenantGroupedPermissions,
    assignPermissionsToTenantRole
} from "./permission.controller.js";
import { requireTenantPermission } from "../../../../core/middlewares/permission.middleware.js";

/**
 * Tenant-side permission routes — mounted at /api/v1/tenant/:tenantName/permissions
 * (authMiddleware is applied by the tenant router).
 */
const router = Router();

// Permission catalog grouped by domain (used by the role → permission matrix)
router.get("/", requireTenantPermission("VIEW_TENANT_PERMISSIONS"), listTenantGroupedPermissions);

// Replace the full permission set of one tenant role
router.post("/assign/:roleId", requireTenantPermission("ASSIGN_TENANT_PERMISSIONS"), assignPermissionsToTenantRole);

export default router;
