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
    deletePlatformPermission,
    listpermissionbyroleId
} from "./permission.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Platform Permissions
router.post("/", requirePlatformPermission("CREATE_PERMISSION"), createPlatformPermission);
router.put("/:id", requirePlatformPermission("UPDATE_PERMISSION"), updatePlatformPermission);
router.get("/", requirePlatformPermission("VIEW_PERMISSIONS"), listPlatformPermissions);
router.post("/assign", requirePlatformPermission("ASSIGN_PERMISSIONS"), assignPermissionsToPlatformRole);
router.delete("/assign", requirePlatformPermission("REMOVE_PERMISSION"), removePermissionFromPlatformRole);
router.get("/assign/:roleId", requirePlatformPermission("VIEW_PERMISSIONS"), listpermissionbyroleId);

// Platform Permission Domains
router.post("/assign-domain", requirePlatformPermission("ASSIGN_PERMISSION_DOMAIN"), assignPermissionsToDomain);
router.post("/domains", requirePlatformPermission("CREATE_PERMISSION_DOMAIN"), createPlatformPermissionDomain);
router.get("/domains", requirePlatformPermission("VIEW_PERMISSION_DOMAINS"), listPlatformPermissionDomains);
router.put("/domains/:id", requirePlatformPermission("UPDATE_PERMISSION_DOMAIN"), updatePlatformPermissionDomain);
router.delete("/domains/:id", requirePlatformPermission("DELETE_PERMISSION_DOMAIN"), deletePlatformPermissionDomain);
// Keep the "/:id" catch-all last so it does not shadow /assign or /domains
router.delete("/:id", requirePlatformPermission("DELETE_PERMISSION"), deletePlatformPermission);

export default router;

