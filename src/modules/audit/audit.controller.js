import prisma from "../../core/config/db.js";

/**
 * 👤 TENANT USER
 * Get own audit logs only
 */
export const getMyAuditLogs = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    console.info(
      `[getMyAuditLogs] tenant=${tenantId} user=${userId}`
    );

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        userId,
        actorType: "TENANT_USER",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        meta: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      logs,
    });
  } catch (err) {
    console.error(
      `[getMyAuditLogs] error user=${req.user?.id}: ${err.message}`,
      err
    );
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
};
