import express from "express";
import {
    createPlatformRole,
    listPlatformRoles,
    updatePlatformRole,
    deletePlatformRole
} from "./role.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../../core/middlewares/permission.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requirePermission("CREATE_PLATFORM_ROLE"), createPlatformRole);
router.get("/", requirePermission("VIEW_PLATFORM_ROLES"), listPlatformRoles);
router.patch("/:id", requirePermission("UPDATE_PLATFORM_ROLE"), updatePlatformRole);
router.delete("/:id", requirePermission("DELETE_PLATFORM_ROLE"), deletePlatformRole);

export default router;
