import express from "express";
import {
    createPlatformPermission,
    updatePlatformPermission,
    listPlatformPermissions,
    assignPermissionsToPlatformRole,
    createPlatformPermissionDomain,
    listPlatformPermissionDomains,
    updatePlatformPermissionDomain,
    deletePlatformPermissionDomain,
    assignPermissionsToDomain,
    removePermissionFromPlatformRole,
    listpermissionbyroleId
} from "./permission.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../../core/middlewares/permission.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Platform Permissions
router.post("/", requirePermission("CREATE_PERMISSION"), createPlatformPermission);
router.put("/:id", requirePermission("UPDATE_PERMISSION"), updatePlatformPermission);
router.get("/", requirePermission("VIEW_PERMISSIONS"), listPlatformPermissions);
router.post("/assign", requirePermission("ASSIGN_PERMISSIONS"), assignPermissionsToPlatformRole);
router.delete("/assign", requirePermission("REMOVE_PERMISSION"), removePermissionFromPlatformRole);
router.get("/assign/:roleId", requirePermission("VIEW_PERMISSIONS"), listpermissionbyroleId);

// Platform Permission Domains
router.post("/assign-domain", requirePermission("ASSIGN_PERMISSION_DOMAIN"), assignPermissionsToDomain);
router.post("/domains", requirePermission("CREATE_PERMISSION_DOMAIN"), createPlatformPermissionDomain);
router.get("/domains", requirePermission("VIEW_PERMISSION_DOMAINS"), listPlatformPermissionDomains);
router.put("/domains/:id", requirePermission("UPDATE_PERMISSION_DOMAIN"), updatePlatformPermissionDomain);
router.delete("/domains/:id", requirePermission("DELETE_PERMISSION_DOMAIN"), deletePlatformPermissionDomain);
export default router;

