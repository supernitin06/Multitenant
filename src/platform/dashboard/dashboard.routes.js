import { Router } from "express";
import { getSuperAdminDashboardSummary } from "./dashboard.controller.js";
import { authMiddleware } from "../../core/middlewares/auth.middleware.js";

const router = Router();

router.get("/summary", authMiddleware, getSuperAdminDashboardSummary);

export default router;
