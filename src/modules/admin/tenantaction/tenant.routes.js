import { Router } from "express";

// Tenant Controllers / Routes
import roleRoutes from "../tenants/roles/role.routes.js";
import permissionRoutes from "../tenants/permissions/permission.routes.js";
import userRoutes from "../featuresa_available/users/user.routes.js";
import staffRoutes from "../tenants/tenants_staff/tenantstaff.routes.js";
import tenantSettingsRoutes from "../tenants/settings/settings.routes.js";
import tenantBrandingRoutes from "../branding/branding.routes.js";
import adminDashboardRoutes from "../dashboard/dashboard.routes.js";
import auditRoutes from "../../audit/audit.routes.js";
import studentRoutes from "../featuresa_available/education/student/student.route.js";
import teacherRoutes from "../featuresa_available/education/teachers/teachers.route.js";
import examinationRoutes from "../featuresa_available/education/examination_portal/examination.route.js";
import classRoutes from "../featuresa_available/education/classes/class.route.js";
import {
  loginTenantMember,
  findTenantBySlug,
  getMyPlanDomains,
  getMyPlanHistory,
} from "../../auth/tenantAuth.controller.js";

// Middleware
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { checkSubscription } from "../../../core/middlewares/subscription.middleware.js";

/**
 * Everything that happens INSIDE one tenant.
 * Mounted at /api/v1/tenant/:tenantName  (tenantName = tenant username or name)
 */
const router = Router({ mergeParams: true });

// ── Public ───────────────────────────────────────────────────────────────────
// Staff members and users log in here (tenant admin uses /api/v1/auth/tenant/login)
router.post("/login", loginTenantMember);
router.post("/management-staff/login", loginTenantMember); // backwards compatible

// ── Authenticated ────────────────────────────────────────────────────────────
router.use(authMiddleware);

// The tenant in the URL must be the caller's own tenant
router.use(async (req, res, next) => {
  try {
    if (!req.user.tenantId) {
      return res.status(403).json({ success: false, message: "Log in with a tenant account to use this area." });
    }
    const tenant = await findTenantBySlug(req.params.tenantName);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: "You do not have access to this organisation." });
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Available even without an active plan (pricing / plan history screens)
router.get("/plan/domains", getMyPlanDomains);
router.get("/plan/history", getMyPlanHistory);

// Everything below needs an active subscription
router.use(checkSubscription);

// Access control
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/management-staff", staffRoutes);
router.use("/users", userRoutes);

// Education domain
router.use("/students", studentRoutes);
router.use("/teachers", teacherRoutes);
router.use("/exam", examinationRoutes);
router.use("/classes", classRoutes);

// Misc
router.use("/tenant-settings", tenantSettingsRoutes);
router.use("/tenant/branding", tenantBrandingRoutes);
router.use("/dashboard", adminDashboardRoutes);
router.use("/audit", auditRoutes);

export default router;
