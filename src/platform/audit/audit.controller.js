import prisma from "../../core/config/db.js";

// 👑 Super Admin: All audits
export const getAllAuditLogs = async (req, res) => {
  try {
    console.info("[getAllAuditLogs] fetching latest audits");
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ success: true, logs });
  } catch (err) {
    console.error(`[getAllAuditLogs] error fetching audits: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to fetch audits" });
  }
};

// 🏫 Tenant Admin: Tenant-only audits
export const getTenantAuditLogs = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    console.info(`[getTenantAuditLogs] tenant=${tenantId} user=${req.user?.id ?? 'unknown'}`);


    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ success: true, logs });
  } catch (err) {
    console.error(`[getTenantAuditLogs] error fetching audits for tenant=${req.user?.tenantId}: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to fetch audits" });
  }
};
