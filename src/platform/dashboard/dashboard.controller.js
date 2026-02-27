import prisma from "../../core/config/db.js";

/**
 * SUPER ADMIN DASHBOARD SUMMARY
 */
export const getSuperAdminDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 🚀 Parallel queries
    const [
      totalTenants,
      activeTenants,
      inactiveTenants,
      tenantsByType,
      totalUsers,
      totalPlans,
      recentTenants,
      recentAudits,
    ] = await Promise.all([
      prisma.tenant.count(),

      prisma.tenant.count({
        where: { isActive: true },
      }),

      prisma.tenant.count({
        where: { isActive: false },
      }),

      prisma.tenant.groupBy({
        by: ["tenantType"],
        _count: { tenantType: true },
      }),

      prisma.user.count(),

      prisma.subscription_plan.count(),

      prisma.tenant.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),

      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      metrics: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          inactive: inactiveTenants,
          newLast30Days: recentTenants,
          byType: tenantsByType.map(t => ({
            type: t.tenantType,
            count: t._count.tenantType,
          })),
        },

        users: {
          total: totalUsers,
        },

        plans: {
          total: totalPlans,
        },

        activity: {
          recentAudits,
        },
      },
    });
  } catch (error) {
    console.error("DASHBOARD SUMMARY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
    });
  }
};
