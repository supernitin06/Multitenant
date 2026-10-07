import express from "express";
import {
  getAllAuditLogs,
  getTenantAuditLogs,
} from "./audit.controller.js";

// import superAdminAuth from "../../middlewares/superAdmin.middleware.js";
// import tenantAuth from "../../middlewares/auth.middleware.js";
import { authMiddleware } from "../../core/middlewares/auth.middleware.js";
import { requirePlatformPermission, requireTenantPermission } from "../../core/middlewares/permission.middleware.js";
const router = express.Router();

// 👑 Super Admin
router.get("/platform", authMiddleware, requirePlatformPermission("VIEW_AUDIT_LOGS"), getAllAuditLogs);

// 🏫 Tenant Admin
router.get("/tenant", authMiddleware, requireTenantPermission("VIEW_TENANT_AUDIT_LOGS"), getTenantAuditLogs);

export default router;
