import prisma from "../../core/config/db.js";

export const writeAuditLog = async ({
  actorType,
  userId,
  superAdminId,
  platformManagementId,
  tenantStaffId,
  tenantId,
  action,
  entity,
  entityId,
  meta,
  req,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorType,
        userId,
        superAdminId,
        platformManagementId,
        tenantStaffId,
        tenantId,
        action,
        entity,
        entityId,
        meta,
        ipAddress: req?.ip || null,
        userAgent: req?.headers ? req.headers["user-agent"] : null,
      },
    });
  } catch (err) {
    console.error("[AUDIT_LOG_FAILED]", err.message);
  }
};


/**
 * Maps req.user to the actor columns of audit_log.
 * Use as: writeAuditLog({ ...auditActor(req.user), action, entity, ... })
 */
export const auditActor = (user = {}) => {
  switch (user.type) {
    case "SUPER_ADMIN":
      return { actorType: "SUPER_ADMIN", superAdminId: user.id };
    case "PLATFORM_STAFF":
      return { actorType: "PLATFORM_MANAGEMENT", platformManagementId: user.id };
    case "TENANT_STAFF":
      return { actorType: "TENANT_STAFF", tenantStaffId: user.id, tenantId: user.tenantId };
    case "USER":
      return { actorType: "TENANT_USER", userId: user.id, tenantId: user.tenantId };
    case "TENANT":
      // The tenant admin account has no row in `user`, so only the tenant is recorded.
      return { actorType: "TENANT_USER", tenantId: user.tenantId };
    default:
      return { actorType: "SUPER_ADMIN" };
  }
};
