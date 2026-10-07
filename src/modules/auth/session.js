import prisma from "../../core/config/db.js";
import { getEffectivePermissions } from "../../core/middlewares/permission.middleware.js";

/**
 * One response shape for every login and for GET /auth/me, so both frontends
 * can store the same object:
 *
 * {
 *   id, type, name, email, role, roleId, power,
 *   permissions: ["*"] | ["KEY", ...],
 *   tenant?: { id, tenantName, tenantUsername, tenantType, isActive,
 *              subscription_planId, is_plan_assigned, logoUrl, themeColor }
 * }
 *
 * For tenant-side sessions the tenant fields are also spread at the top level
 * (tenantName, tenantUsername, subscription_planId, isActive …) because the
 * tenant app reads them from there.
 */
export const buildSession = async (user) => {
  const permissions = await getEffectivePermissions(user);

  const session = {
    id: user.id,
    type: user.type,
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.roleId || null,
    power: user.power ?? null,
    permissions,
  };

  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        tenantName: true,
        tenantUsername: true,
        tenantType: true,
        tenantEmail: true,
        tenantPhone: true,
        tenantAddress: true,
        tenantWebsite: true,
        isActive: true,
        subscription_planId: true,
        subscription_plan: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
        subscription_plan_start_date: true,
        subscription_plan_end_date: true,
        is_plan_assigned: true,
        logoUrl: true,
        faviconUrl: true,
        themeColor: true,
      },
    });

    if (tenant) {
      Object.assign(session, {
        ...tenant,
        id: user.id,
        tenantId: tenant.id,
        tenant,
        planName: tenant.subscription_plan?.name || null,
        planDetails: tenant.subscription_plan || null,
      });
    }
  }

  return session;
};
