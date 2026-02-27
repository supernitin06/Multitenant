import prisma from "../../../core/config/db.js";
import { WIDGET_RESOLVERS } from "./widget.resolvers.js";

export const buildDashboard = async ({
  tenantId,
  permissions,
  enabledModules,
}) => {
  // 🚫 No permission → no dashboard
  if (!permissions?.length) return [];

  // ✅ ONLY widgets explicitly allowed by DB + permission
  const widgets = await prisma.uIWidget.findMany({
    where: {
      permission: { in: permissions },
      moduleKey: { in: enabledModules },
    },
  });

  // Tenant-level enable/disable
  const tenantWidgets = await prisma.tenantWidget.findMany({
    where: { tenantId },
  });

  const enabledMap = Object.fromEntries(
    tenantWidgets.map(w => [w.widgetKey, w.enabled])
  );

  return Promise.all(
    widgets
      // 🚫 tenant disabled widget
      .filter(w => enabledMap[w.key] !== false)
      .map(async w => ({
        key: w.key,
        title: w.title,
        type: w.type,
        data: WIDGET_RESOLVERS[w.key]
          ? await WIDGET_RESOLVERS[w.key](tenantId, prisma)
          : null,
      }))
  );
};

