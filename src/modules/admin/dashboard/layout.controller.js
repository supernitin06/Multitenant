export const saveDashboardLayout = async (req, res) => {
  const { tenantId, roleId, tenant } = req.user;
  const { layoutKey, breakpoint, layout } = req.body;

  await req.prisma.dashboardLayout.upsert({
    where: {
      tenantId_roleId_uiVersion_layoutKey_breakpoint: {
        tenantId,
        roleId,
        uiVersion: tenant.uiVersion,
        layoutKey,
        breakpoint,
      },
    },
    update: { layout },
    create: {
      tenantId,
      roleId,
      uiVersion: tenant.uiVersion,
      layoutKey,
      breakpoint,
      layout,
    },
  });

  res.json({ success: true });
};
