import pkg from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Seeding started...");

//   // -----------------------------
//   // 1. MODULES (ERP FEATURES)
//   // -----------------------------
//   const modules = [
//     { key: "students", name: "Students Management" },
//     { key: "attendance", name: "Attendance" },
//     { key: "fees", name: "Fees Management" },
//     { key: "exams", name: "Examinations" },
//     { key: "library", name: "Library" },
//   ];

//   for (const module of modules) {
//     await prisma.module.upsert({
//       where: { key: module.key },
//       update: {},
//       create: module,
//     });
//   }

//   console.log("✅ Modules seeded");

//   // -----------------------------
//   // 2. PERMISSIONS (RBAC)
//   // -----------------------------
//   const permissions = [
//     // Students
//     "student.create",
//     "student.view",
//     "student.update",
//     "student.delete",

//     // Attendance
//     "attendance.mark",
//     "attendance.view",

//     // Fees
//     "fees.create",
//     "fees.collect",
//     "fees.view",

//     // Exams
//     "exam.create",
//     "exam.view",

//     // Platform
//     "tenant.create",
//     "tenant.view",
//   ];

//   for (const key of permissions) {
//     await prisma.permission.upsert({
//       where: { key },
//       update: {},
//       create: { key },
//     });
//   }

//   console.log("✅ Permissions seeded");

// // -----------------------------
// // 3. SUPER ADMIN (PLATFORM)
// // -----------------------------
// const superAdminEmail = "superadmin@bterp.com";
// const superAdminPassword = "SuperAdmin@123";

// const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

// // Check if Super Admin already exists
// const existingSuperAdmin = await prisma.user.findFirst({
//   where: {
//     email: superAdminEmail,
//     tenantId: null,
//   },
// });

// if (!existingSuperAdmin) {
//   await prisma.user.create({
//     data: {
//       email: superAdminEmail,
//       password: hashedPassword,
//       tenantId: null,
//       roleId: null,
//     },
//   });

//   console.log("✅ Super Admin created");
// } else {
//   console.log("ℹ️ Super Admin already exists");
// }

// console.log("📧 Email:", superAdminEmail);
// console.log("🔑 Password:", superAdminPassword);
//   console.log("✅ Super Admin created");
//   console.log("📧 Email:", superAdminEmail);
//   console.log("🔑 Password:", superAdminPassword);

//   console.log("🌱 Seeding completed successfully");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seeding failed", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
// console.log("🌱 Seeding modules...");

// console.log("🌱 Seeding permissions...");

// const permissions = [
//   "view_dashboard",
//   "manage_students",
//   "manage_attendance",
//   "manage_fees",
// ];

// for (const key of permissions) {
//   await prisma.permission.upsert({
//     where: { key },
//     update: {},
//     create: { key },
//   });
// }

// console.log("✅ Permissions seeded");

// console.log("🌱 Linking modules to TRIAL plan...");

// const trialPlan = await prisma.plan.findFirst({
//   where: { name: "TRIAL", isActive: true },
// });

// if (!trialPlan) {
//   throw new Error("TRIAL plan not found");
// }

// const allModules = await prisma.module.findMany();

// for (const module of allModules) {
//   await prisma.planModule.upsert({
//     where: {
//       planId_moduleId: {
//         planId: trialPlan.id,
//         moduleId: module.id,
//       },
//     },
//     update: {},
//     create: {
//       planId: trialPlan.id,
//       moduleId: module.id,
//     },
//   });
// }

// console.log("✅ Plan modules linked");

// console.log("🌱 Assigning permissions to Admin roles...");

// const adminRoles = await prisma.role.findMany({
//   where: { name: "Admin" },
// });

// const allPermissions = await prisma.permission.findMany();

// for (const role of adminRoles) {
//   for (const permission of allPermissions) {
//     await prisma.rolePermission.upsert({
//       where: {
//         roleId_permissionId: {
//           roleId: role.id,
//           permissionId: permission.id,
//         },
//       },
//       update: {},
//       create: {
//         roleId: role.id,
//         permissionId: permission.id,
//       },
//     });
//   }
// }

// console.log("✅ Role permissions assigned");

// const COMMON_MODULES = [
//   // { key: "dashboard", name: "Dashboard" },
//   { key: "profile", name: "Profile" },
//   { key: "users", name: "User Management" },
//   { key: "roles", name: "Role & Permissions" },
//   { key: "settings", name: "Settings" },
//   { key: "notifications", name: "Notifications" },
//   { key: "audit_logs", name: "Audit Logs" },
//   { key: "support", name: "Support" },
// ];

// async function seedCommonModules() {
//   for (const mod of COMMON_MODULES) {
//     await prisma.module.upsert({
//       where: { key: mod.key },
//       update: {
//         isCommon: true,
       
//       },
//       create: {
//         key: mod.key,
//         name: mod.name,
//         isCommon: true,
       
//       },
//     });
//   }

//   console.log("✅ Common modules seeded");
// }
// seedCommonModules()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());




await prisma.uIWidget.createMany({
  data: [
    {
      key: "TOTAL_USERS",
      title: "Total Users",
      type: "stat",
      permission: "VIEW_USERS",
      moduleKey: "USERS",
    },
    {
      key: "RECENT_ACTIVITIES",
      title: "Recent Activities",
      type: "list",
      permission: "VIEW_AUDIT_LOGS",
      moduleKey: "USERS",
    },
  ],
  skipDuplicates: true,
});
