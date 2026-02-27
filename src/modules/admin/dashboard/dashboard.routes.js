import { Router } from "express";
import { getAdminDashboardSummary } from "./dashboard.controller.js";
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";

const router = Router();

// Tenant Admin dashboard
router.get("/summary", authMiddleware, getAdminDashboardSummary);

export default router;
