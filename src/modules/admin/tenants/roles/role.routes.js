import { Router } from "express";
import {
  createTenantRole,
  getTenantRoles,
  getTenantRoleById,
  updateTenantRole,
  deleteTenantRole,
} from "./role.controller.js";

import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";
import { requireTenantPermission } from "../../../../core/middlewares/permission.middleware.js";

const router = Router();

router.use(authMiddleware);

// Create Tenant Role
router.post("/", requireTenantPermission("CREATE_TENANT_ROLE"), createTenantRole);
// View Tenant Roles
router.get("/", requireTenantPermission("VIEW_TENANT_ROLES"), getTenantRoles);
router.get("/:roleId", requireTenantPermission("VIEW_TENANT_ROLES"), getTenantRoleById);

// Update Tenant Role
router.put("/:roleId", requireTenantPermission("UPDATE_TENANT_ROLE"), updateTenantRole);

// Delete Tenant Role
router.delete("/:roleId", requireTenantPermission("DELETE_TENANT_ROLE"), deleteTenantRole);

export default router;
