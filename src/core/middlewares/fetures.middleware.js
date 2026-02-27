import prisma from "../config/db.js";

/**
 * Middleware to check if a specific domain is included in the tenant's subscription plan.
 */
export const checkDomainInPlan = (domainName) => {
  return async (req, res, next) => {
    try {
      const { tenantId, role, type } = req.user;

      // Super admins bypass this check
      if (role === "SUPER_ADMIN" && type === "SUPER_ADMIN") {
        return next();
      }

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: "Tenant context missing",
        });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          isActive: true,
          subscription_planId: true,
        },
      });

      if (!tenant || !tenant.isActive || !tenant.subscription_planId) {
        return res.status(403).json({
          success: false,
          message: "Active subscription plan required",
        });
      }

      // Check if the domain is assigned to the plan
      // We check by domain_name to match the argument
      const domainAssignment = await prisma.subscription_Plan_Domain.findFirst({
        where: {
          subscription_planId: tenant.subscription_planId,
          domain_name: domainName,
          
        },
      });

      if (!domainAssignment) {
        return res.status(403).json({
          success: false,
          message: `The "${domainName}" domain is not included in your current subscription plan.`,
        });
      }

      next();
    } catch (error) {
      console.error("Domain access validation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate domain access",
      });
    }
  };
};
