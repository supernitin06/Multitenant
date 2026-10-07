/**
 * Seed data for `npm run seed` (prisma/seed.js).
 *
 * Permissions themselves live in src/core/constants/permissions.js — this file
 * only decides which ROLE gets which permission, plus the demo accounts.
 *
 * Demo account passwords come from SEED_DEFAULT_PASSWORD (see .env), falling
 * back to DEFAULT_DEV_PASSWORD below. Change them before using any of these
 * accounts outside local development.
 */
import {
  PLATFORM_PERMISSION_GROUPS,
  TENANT_PERMISSION_GROUPS,
} from "../src/core/constants/permissions.js";

export const DEFAULT_DEV_PASSWORD = "Password@123";

const platformKeys = (...domains) =>
  PLATFORM_PERMISSION_GROUPS
    .filter((g) => domains.includes(g.domain))
    .flatMap((g) => g.permissions.map((p) => p.key));

const ALL_PLATFORM = PLATFORM_PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
const PLATFORM_VIEW_ONLY = ALL_PLATFORM.filter((k) => k.startsWith("VIEW_") || k === "GET_FEATURE_BY_DOMAIN");

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN (only created when no super admin with this email exists)
// ─────────────────────────────────────────────────────────────────────────────
export const SUPER_ADMIN = {
  email: process.env.SEED_SUPERADMIN_EMAIL || "super@erp.com",
  name: "Super Admin",
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ROLES  (power: higher = more authority; Super Admin is 1000)
// ─────────────────────────────────────────────────────────────────────────────
export const PLATFORM_ROLES = [
  {
    name: "PLATFORM ADMIN",
    power: 900,
    description: "Runs the platform day to day. Has every platform permission.",
    permissions: ALL_PLATFORM,
  },
  {
    name: "OPERATIONS MANAGER",
    power: 700,
    description: "Onboards and supports tenants, manages plans and the feature catalog.",
    permissions: [
      ...platformKeys("Tenant Management", "Subscriptions & Billing", "Feature Catalog"),
      "VIEW_STAFF", "VIEW_PLATFORM_ROLES", "VIEW_DASHBOARD", "VIEW_AUDIT_LOGS",
      "VIEW_TENANT_PERMISSION_CATALOG",
    ],
  },
  {
    name: "BILLING MANAGER",
    power: 500,
    description: "Looks after subscription plans and which tenant is on which plan.",
    permissions: [
      ...platformKeys("Subscriptions & Billing"),
      "VIEW_TENANTS", "VIEW_FEATURES", "VIEW_FEATURE_DOMAINS", "GET_FEATURE_BY_DOMAIN", "VIEW_DASHBOARD",
    ],
  },
  {
    name: "SUPPORT EXECUTIVE",
    power: 300,
    description: "Helps tenants. Can see tenants and plans and switch a tenant on or off.",
    permissions: [
      "VIEW_TENANTS", "TOGGLE_TENANT_STATUS", "VIEW_SUBSCRIPTIONS", "VIEW_SUBSCRIPTION_HISTORY",
      "VIEW_SUBSCRIPTION_DOMAINS", "VIEW_FEATURES", "VIEW_FEATURE_DOMAINS", "GET_FEATURE_BY_DOMAIN", "VIEW_DASHBOARD",
    ],
  },
  {
    name: "AUDITOR",
    power: 100,
    description: "Read-only access to everything on the platform.",
    permissions: PLATFORM_VIEW_ONLY,
  },
];

// Sidebar sections — names must match the `label`s in Multitenant-admin/src/Data/Sidebar.json
export const PLATFORM_SIDEBARS = [
  "Dashboard",
  "Tenant Management",
  "Plans & Subscription",
  "Roles & Permissions",
  "Role Based Access",
  "Staff Management",
  "Sidebar Management",
  "Audit Logs",
];

export const PLATFORM_ROLE_SIDEBARS = {
  "PLATFORM ADMIN": PLATFORM_SIDEBARS,
  "OPERATIONS MANAGER": ["Dashboard", "Tenant Management", "Plans & Subscription", "Staff Management", "Audit Logs"],
  "BILLING MANAGER": ["Dashboard", "Tenant Management", "Plans & Subscription"],
  "SUPPORT EXECUTIVE": ["Dashboard", "Tenant Management", "Plans & Subscription"],
  "AUDITOR": ["Dashboard", "Tenant Management", "Plans & Subscription", "Roles & Permissions", "Role Based Access", "Staff Management", "Sidebar Management", "Audit Logs"],
};

// One demo staff account per platform role
export const PLATFORM_STAFF = [
  { name: "Priya Sharma", email: "platform.admin@bterp.dev", role: "PLATFORM ADMIN" },
  { name: "Rohan Mehta", email: "operations@bterp.dev", role: "OPERATIONS MANAGER" },
  { name: "Anita Verma", email: "billing@bterp.dev", role: "BILLING MANAGER" },
  { name: "Karan Singh", email: "support@bterp.dev", role: "SUPPORT EXECUTIVE" },
  { name: "Neha Gupta", email: "auditor@bterp.dev", role: "AUDITOR" },
];

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CATALOG (what a subscription plan can include)
// Existing rows are matched by code / name and left as they are.
// ─────────────────────────────────────────────────────────────────────────────
export const FEATURES = [
  { name: "STUDENT MANAGEMENT", code: "SM0001", description: "Admissions and student records" },
  { name: "TEACHER MANAGEMENT", code: "TM001", description: "Teacher records" },
  { name: "CLASS MANAGEMENT", code: "CM001", description: "Classes and sections" },
  { name: "EXAM MANAGEMENT", code: "EM0001", description: "Examinations and date sheets" },
  { name: "STUDENT ATTENDANCE", code: "SA001", description: "Daily student attendance" },
  { name: "TEACHER ATTENDANCE", code: "TA0001", description: "Daily teacher attendance" },
  { name: "FEE MANAGEMENT", code: "FM0001", description: "Fee structure and collection" },
  { name: "LIBRARY MANAGEMENT", code: "LM0001", description: "Libraries and issue / return" },
  { name: "BOOKS MANAGEMENT", code: "BM0001", description: "Book inventory" },
  { name: "DOCTOR MANAGEMENT", code: "DM001", description: "Doctor records" },
  { name: "DOCTOR APPOINTMENT", code: "DA001", description: "Appointment booking" },
  { name: "PATIENT MANAGEMENT", code: "PM0001", description: "Patient records" },
  { name: "LAB MANAGEMENT", code: "LM001", description: "Lab tests and reports" },
  { name: "ROOM MANAGEMENT", code: "RM0001", description: "Wards and rooms" },
];

// domain_name values are referenced in code by checkDomainInPlan("ACADEMIC") etc.
export const FEATURE_DOMAINS = [
  { name: "ACADEMIC", description: "Students and teachers", features: ["SM0001", "TM001"] },
  { name: "CLASSES", description: "Classes and sections", features: ["CM001"] },
  { name: "EXAM", description: "Examinations", features: ["EM0001"] },
  { name: "ATTENDANCE", description: "Student and teacher attendance", features: ["SA001", "TA0001"] },
  { name: "FEE", description: "Fee management", features: ["FM0001"] },
  { name: "LIBRARY", description: "Library and books", features: ["LM0001", "BM0001"] },
  { name: "HOSPITAL", description: "Labs and rooms", features: ["LM001", "RM0001"] },
  { name: "DOCTOR", description: "Doctors and appointments", features: ["DM001", "DA001"] },
  { name: "PATIENT", description: "Patient records", features: ["PM0001"] },
];

// Spelling fixes applied to existing rows (old → new)
export const SPELLING_FIXES = {
  featureDomains: { "ATTANDANCE": "ATTENDANCE", "EMPLOYEEE MANAGEMENT": "EMPLOYEE MANAGEMENT" },
  features: { "LIBRARY MANGEMENT": "LIBRARY MANAGEMENT", "STUDENT ATTANDANCE": "STUDENT ATTENDANCE", "TEACHER ATTANDANCE": "TEACHER ATTENDANCE" },
};

// Only created when no plan with this name exists
export const SUBSCRIPTION_PLANS = [
  { name: "SCHOOL SILVER PLAN", price: 19999, duration: 30, domains: ["ACADEMIC", "CLASSES", "ATTENDANCE", "FEE"] },
  { name: "SCHOOL DIAMOND PLAN", price: 29999, duration: 365, domains: ["ACADEMIC", "CLASSES", "EXAM", "ATTENDANCE", "FEE", "LIBRARY"] },
  { name: "HOSPITAL PLAN", price: 1999, duration: 30, domains: ["HOSPITAL", "DOCTOR", "PATIENT"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// TENANT ROLE TEMPLATES (power 1-99; the tenant admin account is 100)
// Every existing tenant gets the template matching its tenantType.
// ─────────────────────────────────────────────────────────────────────────────
const tenantKeys = (...domains) =>
  TENANT_PERMISSION_GROUPS
    .filter((g) => domains.includes(g.domain))
    .flatMap((g) => g.permissions.map((p) => p.key));
const ALL_TENANT = TENANT_PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

const SCHOOL_ROLES = [
  {
    name: "PRINCIPAL",
    power: 90,
    permissions: ALL_TENANT,
  },
  {
    name: "VICE PRINCIPAL",
    power: 80,
    permissions: [
      ...tenantKeys("Students", "Classes", "Teachers", "Examinations", "User Management"),
      "VIEW_TENANT_STAFF", "VIEW_TENANT_ROLES", "VIEW_TENANT_PERMISSIONS", "VIEW_TENANT_AUDIT_LOGS",
    ],
  },
  {
    name: "TEACHER",
    power: 50,
    permissions: ["READ_STUDENT", "UPDATE_STUDENT", "READ_CLASS", "READ_TEACHER", ...tenantKeys("Examinations")],
  },
  {
    name: "ACCOUNTANT",
    power: 40,
    permissions: ["READ_STUDENT", "READ_TEACHER", "USER_READ"],
  },
  {
    name: "RECEPTIONIST",
    power: 20,
    permissions: ["READ_STUDENT", "CREATE_STUDENT", "READ_CLASS", "READ_TEACHER", "READ_EXAM", "READ_EXAM_SCHEDULE"],
  },
  {
    name: "STUDENT",
    power: 5,
    permissions: ["READ_EXAM", "READ_EXAM_SCHEDULE"],
  },
];

const HOSPITAL_ROLES = [
  { name: "MEDICAL DIRECTOR", power: 90, permissions: ALL_TENANT },
  { name: "DOCTOR", power: 60, permissions: ["USER_READ", "VIEW_TENANT_STAFF"] },
  { name: "NURSE", power: 40, permissions: ["USER_READ"] },
  { name: "RECEPTIONIST", power: 20, permissions: ["USER_READ", "USER_CREATE"] },
];

const GENERIC_ROLES = [
  { name: "MANAGER", power: 80, permissions: ALL_TENANT },
  { name: "TEAM LEAD", power: 50, permissions: [...tenantKeys("User Management"), "VIEW_TENANT_STAFF", "VIEW_TENANT_ROLES"] },
  { name: "EMPLOYEE", power: 20, permissions: ["USER_READ"] },
];

export const tenantRoleTemplate = (tenantType = "") => {
  const type = tenantType.toLowerCase();
  if (type.includes("school") || type.includes("university") || type.includes("college")) return SCHOOL_ROLES;
  if (type.includes("hospital") || type.includes("clinic")) return HOSPITAL_ROLES;
  return GENERIC_ROLES;
};

// ─────────────────────────────────────────────────────────────────────────────
// DEMO TENANT — a complete, ready-to-use school with staff and users
// Tenant admin login (erp_tenants → "Organisation admin"): username demo-school
// Staff / user login (erp_tenants → "Staff / user"): organisation demo-school + email
// ─────────────────────────────────────────────────────────────────────────────
export const DEMO_TENANT = {
  tenantName: "Demo School",
  tenantUsername: "demo-school",
  tenantType: "School",
  tenantEmail: "admin@demo-school.dev",
  tenantPhone: "9000000001",
  tenantAddress: "12 Knowledge Park, Noida",
  plan: "SCHOOL DIAMOND PLAN",
  staff: [
    { name: "Dr. Meera Iyer", email: "principal@demo-school.dev", role: "PRINCIPAL" },
    { name: "Arjun Nair", email: "vp@demo-school.dev", role: "VICE PRINCIPAL" },
    { name: "Sunita Rao", email: "teacher@demo-school.dev", role: "TEACHER" },
    { name: "Vikram Joshi", email: "accounts@demo-school.dev", role: "ACCOUNTANT" },
    { name: "Pooja Kapoor", email: "frontdesk@demo-school.dev", role: "RECEPTIONIST" },
  ],
  users: [
    { name: "Aarav Sharma", email: "aarav.student@demo-school.dev", role: "STUDENT" },
    { name: "Diya Patel", email: "diya.student@demo-school.dev", role: "STUDENT" },
  ],
};
