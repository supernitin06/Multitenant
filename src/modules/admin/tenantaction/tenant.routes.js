import { Router } from "express";

// Tenant Controllers / Routes
import roleRoutes from "../tenants/roles/role.routes.js";
import userRoutes from "../featuresa_available/users/user.routes.js";
import staffRoutes from "../tenants/tenants_staff/tenantstaff.routes.js";
import tenantSettingsRoutes from "../tenants/settings/settings.routes.js";
import tenantBrandingRoutes from "../branding/branding.routes.js";
import adminDashboardRoutes from "../dashboard/dashboard.routes.js";
import auditRoutes from "../../audit/audit.routes.js";
import tenantRoutes from "../tenants/tenant.routes.js";
import featureRoutes from "../features/features.route.js";
import studentRoutes from "../featuresa_available/education/student/student.route.js";
import teacherRoutes from "../featuresa_available/education/teachers/teachers.route.js";
import examinationRoutes from "../featuresa_available/education/examination_portal/examination.route.js";

// Middleware
import { authMiddleware } from "../../../core/middlewares/auth.middleware.js";
import { checkSubscription } from "../../../core/middlewares/subscription.middleware.js";

const router = Router();
router.use("/management-staff", staffRoutes);

// Middleware to ensure user login for these routes
router.use(authMiddleware);

// Check subscription for all following routes
router.use(checkSubscription);

router.use("/roles", roleRoutes);
router.use("/features", featureRoutes);
router.use("/users", userRoutes);
router.use("/students", studentRoutes);
router.use("/teachers", teacherRoutes);
router.use("/exam", examinationRoutes);

// Generic tenant-management routes (contains wildcard /:tenantId)
router.use("/", tenantRoutes);

// lATTER
router.use("/tenant-settings", tenantSettingsRoutes);
router.use("/tenant/branding", tenantBrandingRoutes);
router.use("/dashboard", adminDashboardRoutes);
router.use("/audit", auditRoutes);

export default router;
