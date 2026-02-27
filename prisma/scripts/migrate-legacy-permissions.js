import prisma from "../../src/core/config/db.js";



const LEGACY_MAP = {
  "student.update": {
    key: "STUDENTS_EDIT",
    domain: "STUDENTS",
    action: "EDIT",
    moduleKey: "SCHOOL_STUDENTS",
  },
  "student.delete": {
    key: "STUDENTS_DELETE",
    domain: "STUDENTS",
    action: "DELETE",
    moduleKey: "SCHOOL_STUDENTS",
  },
  "fees.create": {
    key: "FEES_CREATE",
    domain: "FEES",
    action: "CREATE",
    moduleKey: "SCHOOL_FEES",
  },
  "fees.collect": {
    key: "FEES_COLLECT",
    domain: "FEES",
    action: "COLLECT",
    moduleKey: "SCHOOL_FEES",
  },
  "fees.view": {
    key: "FEES_VIEW",
    domain: "FEES",
    action: "VIEW",
    moduleKey: "SCHOOL_FEES",
  },
  "exam.create": {
    key: "EXAMS_CREATE",
    domain: "EXAMS",
    action: "CREATE",
    moduleKey: "SCHOOL_EXAMS",
  },
  "exam.view": {
    key: "EXAMS_VIEW",
    domain: "EXAMS",
    action: "VIEW",
    moduleKey: "SCHOOL_EXAMS",
  },
  "tenant.create": {
    key: "TENANT_CREATE",
    domain: "TENANT",
    action: "CREATE",
    moduleKey: "CORE_TENANT",
  },
  "tenant.view": {
    key: "TENANT_VIEW",
    domain: "TENANT",
    action: "VIEW",
    moduleKey: "CORE_TENANT",
  },
};

async function run() {
  const legacyPermissions = await prisma.permission.findMany({
    where: { domain: null },
  });

  for (const legacy of legacyPermissions) {
    const map = LEGACY_MAP[legacy.key];
    if (!map) {
      console.warn(`⚠️ No mapping for ${legacy.key}`);
      continue;
    }

    // 1️⃣ Ensure modern permission exists
    const modern = await prisma.permission.upsert({
      where: { key: map.key },
      update: {},
      create: map,
    });

    // 2️⃣ Re-assign role permissions
    await prisma.rolePermission.updateMany({
      where: { permissionId: legacy.id },
      data: { permissionId: modern.id },
    });

    // 3️⃣ Safe delete legacy permission
    await prisma.permission.delete({
      where: { id: legacy.id },
    });

    console.log(`🔁 ${legacy.key} → ${map.key}`);
  }

  console.log("🎉 Permission migration completed safely");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
