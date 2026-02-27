import prisma from "../../core/config/db.js";

export const createAuditLog = async ({
  actorId,
  actorType,
  tenantId = null,
  action,
  entity,
  entityId = null,
  meta = {},
  req,
}) => {
  return prisma.auditLog.create({
    data: {
      actorId,
      actorType,
      tenantId,
      action,
      entity,
      entityId,
      meta,
      ipAddress: req?.ip,
      userAgent: req?.headers["user-agent"],
    },
  });
};
