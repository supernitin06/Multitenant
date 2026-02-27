import { Router } from "express";
import { createUser, getUsers, updateUserByAdmin, deleteUser, bulkCreateUsers, restoreUser, toggleUserStatus, getUserDetails, listUsers, updateMyProfile } from "./user.controller.js";
import { authMiddleware } from "../../../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../../../core/middlewares/permission.middleware.js";
import { checkDomainInPlan } from "../../../../core/middlewares/fetures.middleware.js";
import { checkSubscription } from "../../../../core/middlewares/subscription.middleware.js";



const router = Router();
router.use(authMiddleware);
router.use(checkSubscription)
router.use(checkDomainInPlan("USER_MANAGEMENT"))

router.post("/create", authMiddleware, requirePermission("USER_CREATE"), createUser);
router.get("/", authMiddleware, requirePermission("USER_READ"), getUsers);
router.get("/details/:userId", authMiddleware, requirePermission("USER_READ"), getUserDetails);
router.get("/list", authMiddleware, requirePermission("USER_READ"), listUsers);
router.put("/update/:userId", authMiddleware, requirePermission("USER_UPDATE"), updateUserByAdmin);
router.delete("/delete/:userId", authMiddleware, requirePermission("USER_DELETE"), deleteUser);
router.post("/bulk-create", authMiddleware, requirePermission("USER_CREATE"), bulkCreateUsers);
router.put("/toggle-status/:userId", authMiddleware, requirePermission("USER_UPDATE"), toggleUserStatus);
router.put("/restore/:userId", authMiddleware, requirePermission("USER_UPDATE"), restoreUser);
router.delete("/delete/:userId", authMiddleware, requirePermission("USER_DELETE"), deleteUser);
router.put("/update-my-profile", authMiddleware, requirePermission("USER_UPDATE"), updateMyProfile);






export default router;
