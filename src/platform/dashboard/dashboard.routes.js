import { Router } from "express";
import { getSuperAdminDashboardSummary } from "./dashboard.controller.js";
import { authMiddleware } from "../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission } from "../../core/middlewares/permission.middleware.js";

const router = Router();

router.get("/summary", authMiddleware, requirePlatformPermission("VIEW_DASHBOARD"), getSuperAdminDashboardSummary);

export default router;
