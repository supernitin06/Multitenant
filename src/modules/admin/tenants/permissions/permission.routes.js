import { Router } from "express";
import {
    listTenantGroupedPermissions,
    createTenantPermission,
    updateTenantPermission,
    deleteTenantPermission,
    assignPermissionsToTenantRole
} from "./permission.controller.js";
import {
    listTenantPermissionDomains,
    createTenantPermissionDomain,
    updateTenantPermissionDomain,
    deleteTenantPermissionDomain
} from "./permission_domain.controller.js";
import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../../../core/middlewares/permission.middleware.js";

const router = Router();

router.use(authMiddleware);

// List grouped permissions
router.get("/", requirePermission("VIEW_TENANT_PERMISSIONS"), listTenantGroupedPermissions);

// CRUD Permissions
router.post("/", requirePermission("CREATE_TENANT_PERMISSION"), createTenantPermission);
router.put("/:id", requirePermission("UPDATE_TENANT_PERMISSION"), updateTenantPermission);
router.delete("/:id", requirePermission("DELETE_TENANT_PERMISSION"), deleteTenantPermission);

// Assign permissions to a tenant role
router.post("/assign/:roleId", requirePermission("ASSIGN_TENANT_PERMISSIONS"), assignPermissionsToTenantRole);

// Domain Routes
router.get("/domains", listTenantPermissionDomains);
router.post("/domains", createTenantPermissionDomain);
router.put("/domains/:id", updateTenantPermissionDomain);
router.delete("/domains/:id", deleteTenantPermissionDomain);

export default router;


