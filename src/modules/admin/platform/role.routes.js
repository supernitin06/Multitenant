import express from "express";
import {
    createPlatformRole,
    listPlatformRoles,
    updatePlatformRole,
    deletePlatformRole
} from "./role.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../../core/middlewares/permission.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requirePlatformPermission("CREATE_PLATFORM_ROLE"), createPlatformRole);
router.get("/", requirePlatformPermission("VIEW_PLATFORM_ROLES"), listPlatformRoles);
router.patch("/:id", requirePlatformPermission("UPDATE_PLATFORM_ROLE"), updatePlatformRole);
router.delete("/:id", requirePlatformPermission("DELETE_PLATFORM_ROLE"), deletePlatformRole);

export default router;
