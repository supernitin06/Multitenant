import { Router } from "express";
import {
  createTenantRole,
  getTenantRoles,
  getTenantRoleById,
  updateTenantRole,
  deleteTenantRole,
} from "./role.controller.js";

import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../../../core/middlewares/permission.middleware.js";

const router = Router();

router.use(authMiddleware);

// Create Tenant Role
router.post("/", requirePermission("CREATE_TENANT_ROLE"), createTenantRole);
// View Tenant Roles
router.get("/", requirePermission("VIEW_TENANT_ROLES"), getTenantRoles);
router.get("/:roleId", requirePermission("VIEW_TENANT_ROLES"), getTenantRoleById);

// Update Tenant Role
router.put("/:roleId", requirePermission("UPDATE_TENANT_ROLE"), updateTenantRole);

// Delete Tenant Role
router.delete("/:roleId", requirePermission("DELETE_TENANT_ROLE"), deleteTenantRole);

export default router;
