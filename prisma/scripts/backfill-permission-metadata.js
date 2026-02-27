import prisma from "../../src/core/config/db.js";

const METADATA_MAP = {
  DASHBOARD_VIEW: {
    domain: "DASHBOARD",
    action: "VIEW",
    moduleKey: "CORE_DASHBOARD",
  },

  STUDENTS_MANAGE: {
    domain: "STUDENTS",
    action: "MANAGE",
    moduleKey: "SCHOOL_STUDENTS",
  },

  ORDERS_VIEW: {
    domain: "ORDERS",
    action: "VIEW",
    moduleKey: "RESTAURANT_ORDERS",
  },

  ROLES_VIEW: {
    domain: "SECURITY",
    action: "VIEW",
    moduleKey: "CORE_SECURITY",
  },

  ROLES_MANAGE: {
    domain: "SECURITY",
    action: "MANAGE",
    moduleKey: "CORE_SECURITY",
  },

  SETTINGS_EDIT: {
    domain: "SETTINGS",
    action: "EDIT",
    moduleKey: "CORE_SETTINGS",
  },
};

async function run() {
  for (const [key, meta] of Object.entries(METADATA_MAP)) {
    await prisma.permission.updateMany({
      where: { key },
      data: meta,
    });

    console.log(`🧩 Backfilled ${key}`);
  }

  console.log("✅ Permission metadata backfill complete");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
