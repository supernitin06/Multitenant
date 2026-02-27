import prisma from "../config/db.js";

/**
 * Middleware to check if the tenant has an active plan.
 * Since the explicit Subscription model was removed, we check the tenant's relation.
 */
export const checkSubscription = async (req, res, next) => {
  try {
    const { tenantId, role, type } = req.user;



    if (role === "SUPER_ADMIN" || type === "SUPER_ADMIN" || type === "PLATFORM_STAFF") {
      return next();
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription_plan: true
      }
    });

    if (!tenant || !tenant.isActive || !tenant.subscription_planId) {
      return res.status(403).json({
        success: false,
        message: "Active subscription plan required. Please contact support.",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({ success: false, message: "Subscription validation failed" });
  }
};
