export const WIDGET_RESOLVERS = {
  TOTAL_USERS: (tenantId, prisma) =>
    prisma.user.count({ where: { tenantId } }),
  ACTIVE_USERS: (tenantId, prisma) =>
    prisma.user.count({ where: { tenantId, isActive: true } }),
  TOTAL_ROLES: (tenantId, prisma) =>
    prisma.role.count({ where: { tenantId } }),
  ENABLED_MODULES: (tenantId, prisma) =>
    prisma.tenantModule.count({ where: { tenantId, enabled: true } }),
  SUBSCRIPTION: (tenantId, prisma) =>
    prisma.subscription.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        endDate: { gte: new Date() },
      },
      include: {
        plan: true,
      },
    }),

  RECENT_ACTIVITIES: (tenantId, prisma) =>
    prisma.auditLog.findMany({ where: { tenantId }, take: 10 }),
};
