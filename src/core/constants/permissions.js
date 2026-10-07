/**
 * RBAC PERMISSION CATALOG — single source of truth.
 *
 * There are two completely separate permission scopes:
 *
 *  1. PLATFORM scope  → used by the Super Admin panel (Multitenant-admin).
 *     Actors: SUPER_ADMIN (bypasses every check) and PLATFORM_STAFF
 *     (permissions come from their PlatformRole).
 *     Tables: platform_permission, platform_permission_domain, platform_role,
 *             platform_role_permission.
 *
 *  2. TENANT scope    → used inside one tenant (erp_tenants app).
 *     Actors: TENANT (the tenant admin account, bypasses every check inside
 *     its own tenant), TENANT_STAFF and USER (permissions come from their
 *     TenantRole).
 *     Tables: tenant_permission, tenant_permission_domain, tenant_role,
 *             tenant_role_permission.
 *
 * Routes guard themselves with `requirePlatformPermission(KEY)` or
 * `requireTenantPermission(KEY)` from core/middlewares/permission.middleware.js.
 * The seed (prisma/seed.js) writes exactly this catalog to the database, so a
 * key used in a route must be listed here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM PERMISSIONS (grouped by permission domain)
// ─────────────────────────────────────────────────────────────────────────────
export const PLATFORM_PERMISSION_GROUPS = [
  {
    domain: "Tenant Management",
    description: "Onboard, update, activate and remove tenants.",
    permissions: [
      { key: "VIEW_TENANTS", description: "View the list of tenants and their details" },
      { key: "CREATE_TENANT", description: "Onboard a new tenant" },
      { key: "UPDATE_TENANT", description: "Edit a tenant's profile and branding" },
      { key: "DELETE_TENANT", description: "Permanently delete a tenant" },
      { key: "TOGGLE_TENANT_STATUS", description: "Activate or deactivate a tenant" },
    ],
  },
  {
    domain: "Subscriptions & Billing",
    description: "Manage subscription plans and what each plan includes.",
    permissions: [
      { key: "VIEW_SUBSCRIPTIONS", description: "View subscription plans" },
      { key: "CREATE_SUBSCRIPTION", description: "Create a subscription plan" },
      { key: "UPDATE_SUBSCRIPTION", description: "Edit a subscription plan" },
      { key: "DELETE_SUBSCRIPTION", description: "Delete a subscription plan" },
      { key: "ASSIGN_SUBSCRIPTION", description: "Assign a subscription plan to a tenant" },
      { key: "UNASSIGN_SUBSCRIPTION", description: "Remove a subscription plan from a tenant" },
      { key: "VIEW_SUBSCRIPTION_HISTORY", description: "View a tenant's subscription history" },
      { key: "VIEW_SUBSCRIPTION_DOMAINS", description: "View the feature domains included in a plan" },
      { key: "ASSIGN_SUBSCRIPTION_TO_DOMAIN", description: "Add a feature domain to a plan" },
      { key: "REMOVE_SUBSCRIPTION_FROM_DOMAIN", description: "Remove a feature domain from a plan" },
      { key: "SETUP_DEFAULT_PLANS", description: "Create the default set of subscription plans" },
    ],
  },
  {
    domain: "Feature Catalog",
    description: "Manage product features and the feature domains that bundle them.",
    permissions: [
      { key: "VIEW_FEATURES", description: "View product features" },
      { key: "CREATE_FEATURE", description: "Create a product feature" },
      { key: "UPDATE_FEATURE", description: "Edit a product feature" },
      { key: "DELETE_FEATURE", description: "Delete a product feature" },
      { key: "TOGGLE_FEATURE_STATUS", description: "Enable or disable a product feature" },
      { key: "VIEW_FEATURE_DOMAINS", description: "View feature domains" },
      { key: "CREATE_FEATURE_DOMAIN", description: "Create a feature domain" },
      { key: "UPDATE_FEATURE_DOMAIN", description: "Edit a feature domain and its dependencies" },
      { key: "DELETE_FEATURE_DOMAIN", description: "Delete a feature domain" },
      { key: "ASSIGN_FEATURE_DOMAIN", description: "Add a feature to a feature domain" },
      { key: "UNASSIGN_FEATURE_DOMAIN", description: "Remove a feature from a feature domain" },
      { key: "GET_FEATURE_BY_DOMAIN", description: "View the features inside a feature domain" },
    ],
  },
  {
    domain: "Platform Staff",
    description: "Manage the people who operate the platform.",
    permissions: [
      { key: "VIEW_STAFF", description: "View platform staff accounts" },
      { key: "CREATE_STAFF", description: "Create a platform staff account" },
      { key: "UPDATE_STAFF", description: "Edit, activate or deactivate a platform staff account" },
      { key: "DELETE_STAFF", description: "Delete a platform staff account" },
    ],
  },
  {
    domain: "Roles & Permissions",
    description: "Define platform roles and decide what each role is allowed to do.",
    permissions: [
      { key: "VIEW_PLATFORM_ROLES", description: "View platform roles" },
      { key: "CREATE_PLATFORM_ROLE", description: "Create a platform role" },
      { key: "UPDATE_PLATFORM_ROLE", description: "Edit a platform role" },
      { key: "DELETE_PLATFORM_ROLE", description: "Delete a platform role" },
      { key: "VIEW_PERMISSIONS", description: "View platform permissions" },
      { key: "CREATE_PERMISSION", description: "Create a platform permission" },
      { key: "UPDATE_PERMISSION", description: "Edit a platform permission" },
      { key: "DELETE_PERMISSION", description: "Delete a platform permission" },
      { key: "ASSIGN_PERMISSIONS", description: "Grant a permission to a platform role" },
      { key: "REMOVE_PERMISSION", description: "Revoke a permission from a platform role" },
      { key: "VIEW_PERMISSION_DOMAINS", description: "View permission domains" },
      { key: "CREATE_PERMISSION_DOMAIN", description: "Create a permission domain" },
      { key: "UPDATE_PERMISSION_DOMAIN", description: "Edit a permission domain" },
      { key: "DELETE_PERMISSION_DOMAIN", description: "Delete a permission domain" },
      { key: "ASSIGN_PERMISSION_DOMAIN", description: "Group permissions under a permission domain" },
    ],
  },
  {
    domain: "Tenant Permission Catalog",
    description: "Maintain the permissions that tenants can give to their own roles.",
    permissions: [
      { key: "VIEW_TENANT_PERMISSION_CATALOG", description: "View the tenant permission catalog" },
      { key: "MANAGE_TENANT_PERMISSION_CATALOG", description: "Create, edit and delete tenant permissions and their domains" },
    ],
  },
  {
    domain: "Navigation",
    description: "Control which sidebar sections each platform role can see.",
    permissions: [
      { key: "VIEW_PLATFORM_SIDEBARS", description: "View sidebar sections" },
      { key: "CREATE_PLATFORM_SIDEBAR", description: "Create a sidebar section" },
      { key: "ASSIGN_PLATFORM_SIDEBAR", description: "Show a sidebar section to a platform role" },
      { key: "UNASSIGN_PLATFORM_SIDEBAR", description: "Hide a sidebar section from a platform role" },
    ],
  },
  {
    domain: "Audit & Monitoring",
    description: "Review platform activity.",
    permissions: [
      { key: "VIEW_DASHBOARD", description: "View the platform dashboard" },
      { key: "VIEW_AUDIT_LOGS", description: "View platform audit logs" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TENANT PERMISSIONS (grouped by permission domain)
// ─────────────────────────────────────────────────────────────────────────────
export const TENANT_PERMISSION_GROUPS = [
  {
    domain: "User Management",
    description: "Manage the user accounts of this organisation.",
    permissions: [
      { key: "USER_READ", name: "View users" },
      { key: "USER_CREATE", name: "Create users" },
      { key: "USER_UPDATE", name: "Edit, activate or deactivate users" },
      { key: "USER_DELETE", name: "Deactivate (delete) users" },
    ],
  },
  {
    domain: "Staff Management",
    description: "Manage staff members who log in to this organisation.",
    permissions: [
      { key: "VIEW_TENANT_STAFF", name: "View staff members" },
      { key: "CREATE_TENANT_STAFF", name: "Create staff members" },
      { key: "UPDATE_TENANT_STAFF", name: "Edit, activate or deactivate staff members" },
      { key: "DELETE_TENANT_STAFF", name: "Delete staff members" },
    ],
  },
  {
    domain: "Roles & Permissions",
    description: "Define roles inside this organisation and what they can do.",
    permissions: [
      { key: "VIEW_TENANT_ROLES", name: "View roles" },
      { key: "CREATE_TENANT_ROLE", name: "Create roles" },
      { key: "UPDATE_TENANT_ROLE", name: "Edit roles" },
      { key: "DELETE_TENANT_ROLE", name: "Delete roles" },
      { key: "VIEW_TENANT_PERMISSIONS", name: "View available permissions" },
      { key: "ASSIGN_TENANT_PERMISSIONS", name: "Change the permissions of a role" },
    ],
  },
  {
    domain: "Students",
    description: "Student records.",
    permissions: [
      { key: "READ_STUDENT", name: "View students" },
      { key: "CREATE_STUDENT", name: "Admit (create) students" },
      { key: "UPDATE_STUDENT", name: "Edit students" },
      { key: "DELETE_STUDENT", name: "Delete students" },
    ],
  },
  {
    domain: "Classes",
    description: "Classes, sections and academic years.",
    permissions: [
      { key: "READ_CLASS", name: "View classes" },
      { key: "CREATE_CLASS", name: "Create classes" },
      { key: "UPDATE_CLASS", name: "Edit classes" },
      { key: "DELETE_CLASS", name: "Delete classes" },
    ],
  },
  {
    domain: "Teachers",
    description: "Teacher records.",
    permissions: [
      { key: "READ_TEACHER", name: "View teachers" },
      { key: "CREATE_TEACHER", name: "Create teachers" },
      { key: "UPDATE_TEACHER", name: "Edit teachers" },
      { key: "DELETE_TEACHER", name: "Delete teachers" },
    ],
  },
  {
    domain: "Examinations",
    description: "Examinations and date sheets.",
    permissions: [
      { key: "READ_EXAM", name: "View examinations" },
      { key: "CREATE_EXAM", name: "Create examinations" },
      { key: "UPDATE_EXAM", name: "Edit examinations" },
      { key: "DELETE_EXAM", name: "Delete examinations" },
      { key: "READ_EXAM_SCHEDULE", name: "View date sheets" },
      { key: "CREATE_EXAM_SCHEDULE", name: "Add papers to a date sheet" },
      { key: "UPDATE_EXAM_SCHEDULE", name: "Edit date sheet entries" },
    ],
  },
  {
    domain: "Reports & Audit",
    description: "Activity history inside this organisation.",
    permissions: [
      { key: "VIEW_TENANT_AUDIT_LOGS", name: "View activity logs" },
    ],
  },
];

const flatten = (groups) => groups.flatMap((g) => g.permissions.map((p) => p.key));

export const PLATFORM_PERMISSION_KEYS = new Set(flatten(PLATFORM_PERMISSION_GROUPS));
export const TENANT_PERMISSION_KEYS = new Set(flatten(TENANT_PERMISSION_GROUPS));
