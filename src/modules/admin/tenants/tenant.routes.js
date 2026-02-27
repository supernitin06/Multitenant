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
import { requirePermission } from "../../../core/middlewares/permission.middleware.js";

import { upload, setUploadFolder } from "../../../core/middlewares/multer.middleware.js";

const router = Router();

// router.use(authMiddleware); // Removed redundant middleware

router.use(authMiddleware);

router.get("/:tenantId/plan-history", (req, res, next) => {
  console.log("Plan History Route Hit - Params:", req.params);
  tenatPlanHistory(req, res, next);
});

router.get("/", requirePermission("VIEW_TENANT"), listTenants);
// Create tenant (onboarding)
router.post("/", requirePermission("CREATE_TENANT"), setUploadFolder("tenant_profiles"), upload.single("logo"), createTenant);


// Get all tenants (list)

// Get tenant details
router.get("/:tenantId", requirePermission("VIEW_TENANT"), getTenantDetails);

// Update tenant details
router.put("/:tenantId", requirePermission("UPDATE_TENANT"), setUploadFolder("tenant_profiles"), upload.single("logo"), updateTenant);

// Delete tenant
router.delete("/:tenantId", requirePermission("DELETE_TENANT"), deleteTenant);

// Activate / Deactivate tenant
router.patch("/:tenantId/status", requirePermission("TOGGLE_TENANT_STATUS"), toggleTenantStatus);

// router.get("/:tenantId/plan-history", tenatPlanHistory); // Moved to top

export default router;
