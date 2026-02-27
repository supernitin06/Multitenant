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

