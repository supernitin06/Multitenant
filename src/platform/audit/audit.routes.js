import express from "express";
import {
  getAllAuditLogs,
  getTenantAuditLogs,
} from "./audit.controller.js";

// import superAdminAuth from "../../middlewares/superAdmin.middleware.js";
// import tenantAuth from "../../middlewares/auth.middleware.js";
import { authMiddleware } from "../../core/middlewares/auth.middleware.js";
const router = express.Router();

// 👑 Super Admin
router.get("/platform",  getAllAuditLogs);

// 🏫 Tenant Admin
router.get("/tenant", authMiddleware, getTenantAuditLogs);

export default router;
