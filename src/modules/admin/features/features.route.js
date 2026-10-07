import { Router } from "express";
import {
    createFeature,
    listFeatures,
    getFeatureDetails,
    updateFeature,
    deleteFeature,
    toggleFeatureStatus,
} from "./features.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";

const router = Router();

// Protect all feature routes
router.use(authMiddleware);

// 👑 Feature Management
router.post("/", requirePlatformPermission("CREATE_FEATURE"), createFeature);
router.get("/", requirePlatformPermission("VIEW_FEATURES"), listFeatures);
router.get("/:featureId", requirePlatformPermission("VIEW_FEATURES"), getFeatureDetails);
router.put("/:featureId", requirePlatformPermission("UPDATE_FEATURE"), updateFeature);
router.delete("/:featureId", requirePlatformPermission("DELETE_FEATURE"), deleteFeature);
router.patch("/:featureId/status", requirePlatformPermission("TOGGLE_FEATURE_STATUS"), toggleFeatureStatus);


export default router;
