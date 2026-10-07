import { Router } from "express";
import {
  createTenant,
  listTenants,
  updateTenant,
  deleteTenant,
  toggleTenantStatus,
  getTenantDetails,
  tenatPlanHistory,
} from "./tenant.controller.js";

import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";

import { upload, setUploadFolder } from "../../../core/middlewares/multer.middleware.js";

const router = Router();

// router.use(authMiddleware); // Removed redundant middleware

router.use(authMiddleware);

router.get("/:tenantId/plan-history", requirePlatformPermission("VIEW_SUBSCRIPTION_HISTORY"), tenatPlanHistory);

router.get("/", requirePlatformPermission("VIEW_TENANTS"), listTenants);
// Create tenant (onboarding)
router.post("/", requirePlatformPermission("CREATE_TENANT"), setUploadFolder("tenant_profiles"), upload.single("logo"), createTenant);


// Get all tenants (list)

// Get tenant details
router.get("/:tenantId", requirePlatformPermission("VIEW_TENANTS"), getTenantDetails);

// Update tenant details
router.put("/:tenantId", requirePlatformPermission("UPDATE_TENANT"), setUploadFolder("tenant_profiles"), upload.single("logo"), updateTenant);

// Delete tenant
router.delete("/:tenantId", requirePlatformPermission("DELETE_TENANT"), deleteTenant);

// Activate / Deactivate tenant
router.patch("/:tenantId/status", requirePlatformPermission("TOGGLE_TENANT_STATUS"), toggleTenantStatus);

// router.get("/:tenantId/plan-history", tenatPlanHistory); // Moved to top

export default router;
