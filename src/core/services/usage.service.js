export const canConsume = async (tenantId, addOnKey, amount = 1) => {
  const addOn = await prisma.addOn.findUnique({
    where: { key: addOnKey },
  });

  if (!addOn) return false;

  const tenantAddOn = await prisma.tenantAddOn.findUnique({
    where: {
      tenantId_addOnId: {
        tenantId,
        addOnId: addOn.id,
      },
    },
  });

  if (!tenantAddOn) return false;

  return tenantAddOn.used + amount <= tenantAddOn.quantity;
};

export const consumeUsage = async (tenantId, addOnKey, amount = 1) => {
  const addOn = await prisma.addOn.findUnique({
    where: { key: addOnKey },
  });

  await prisma.tenantAddOn.update({
    where: {
      tenantId_addOnId: {
        tenantId,
        addOnId: addOn.id,
      },
    },
    data: {
      used: { increment: amount },
    },
  });
};
