import { Router } from "express";
import { createUser, updateUserByAdmin, deleteUser, bulkCreateUsers, restoreUser, toggleUserStatus, getUserDetails, listUsers, updateMyProfile } from "./user.controller.js";
import { requireTenantPermission } from "../../../../core/middlewares/permission.middleware.js";

/**
 * Tenant users — mounted at /api/v1/tenant/:tenantName/users
 * (authMiddleware + checkSubscription are applied by the tenant router)
 */
const router = Router();

router.get("/", requireTenantPermission("USER_READ"), listUsers);
router.get("/list", requireTenantPermission("USER_READ"), listUsers);
router.get("/details/:userId", requireTenantPermission("USER_READ"), getUserDetails);
router.post("/create", requireTenantPermission("USER_CREATE"), createUser);
router.post("/bulk-create", requireTenantPermission("USER_CREATE"), bulkCreateUsers);
router.put("/update/:userId", requireTenantPermission("USER_UPDATE"), updateUserByAdmin);
router.put("/toggle-status/:userId", requireTenantPermission("USER_UPDATE"), toggleUserStatus);
router.put("/restore/:userId", requireTenantPermission("USER_UPDATE"), restoreUser);
router.delete("/delete/:userId", requireTenantPermission("USER_DELETE"), deleteUser);

// Any logged-in user may edit their own name / password
router.put("/update-my-profile", updateMyProfile);

export default router;
