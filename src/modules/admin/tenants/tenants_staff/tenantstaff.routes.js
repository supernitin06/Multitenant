import express from "express";
import {
    registerTenantStaff,
    listTenantStaff,
    updateTenantStaff,
    deleteTenantStaff,
} from "./tenantstaff.controller.js";
import { requireTenantPermission } from "../../../../core/middlewares/permission.middleware.js";

/**
 * Mounted at /api/v1/tenant/:tenantName/management-staff
 * (authMiddleware is applied by the tenant router; staff log in via
 *  POST /api/v1/tenant/:tenantName/login)
 */
const router = express.Router();

router.get("/", requireTenantPermission("VIEW_TENANT_STAFF"), listTenantStaff);
router.post("/register", requireTenantPermission("CREATE_TENANT_STAFF"), registerTenantStaff);
router.patch("/:id", requireTenantPermission("UPDATE_TENANT_STAFF"), updateTenantStaff);
router.delete("/:id", requireTenantPermission("DELETE_TENANT_STAFF"), deleteTenantStaff);

export default router;
