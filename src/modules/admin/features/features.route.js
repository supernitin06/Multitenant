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
import { requirePermission } from "../../../core/middlewares/permission.middleware.js";

const router = Router();

// Protect all feature routes
router.use(authMiddleware);

// 👑 Feature Management
router.post("/", requirePermission("CREATE_FEATURE"), createFeature);
router.get("/", requirePermission("VIEW_FEATURES"), listFeatures);
router.get("/:featureId", requirePermission("VIEW_FEATURES"), getFeatureDetails);
router.put("/:featureId", requirePermission("UPDATE_FEATURE"), updateFeature);
router.delete("/:featureId", requirePermission("DELETE_FEATURE"), deleteFeature);
router.patch("/:featureId/status", requirePermission("UPDATE_FEATURE"), toggleFeatureStatus);


export default router;
