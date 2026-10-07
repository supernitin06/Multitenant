/**
 * Database seed — run with `npm run seed`.
 *
 * Safe to run any number of times: it only CREATES what is missing and adds
 * missing role ↔ permission links. It never deletes rows and never changes
 * passwords of existing accounts.
 *
 * What it seeds:
 *   1. Platform permissions + permission domains   (Super Admin panel RBAC)
 *   2. Platform roles, their permissions and sidebar sections
 *   3. Super Admin + one demo platform staff account per role
 *   4. Tenant permissions + permission domains     (tenant portal RBAC)
 *   5. Feature catalog, feature domains and subscription plans
 *   6. Default tenant roles for every existing tenant
 *   7. A complete demo tenant ("demo-school") with staff and users
 */
import "dotenv/config";
import pkg from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PLATFORM_PERMISSION_GROUPS,
  TENANT_PERMISSION_GROUPS,
} from "../src/core/constants/permissions.js";
import {
  DEFAULT_DEV_PASSWORD,
  SUPER_ADMIN,
  PLATFORM_ROLES,
  PLATFORM_SIDEBARS,
  PLATFORM_ROLE_SIDEBARS,
  PLATFORM_STAFF,
  FEATURES,
  FEATURE_DOMAINS,
  SPELLING_FIXES,
  SUBSCRIPTION_PLANS,
  tenantRoleTemplate,
  DEMO_TENANT,
} from "./seed-data.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || DEFAULT_DEV_PASSWORD;
const stats = {};
const count = (label, n = 1) => { stats[label] = (stats[label] || 0) + n; };

const ciEquals = (value) => ({ equals: value, mode: "insensitive" });

// ─────────────────────────────────────────────────────────────────────────────
// 1. Platform permissions & domains
// ─────────────────────────────────────────────────────────────────────────────
async function seedPlatformPermissions() {
  for (const group of PLATFORM_PERMISSION_GROUPS) {
    let domain = await prisma.platformPermissionDomain.findUnique({ where: { name: group.domain } });
    if (!domain) {
      domain = await prisma.platformPermissionDomain.create({
        data: { name: group.domain, description: group.description },
      });
      count("platform permission domains created");
    }

    for (const p of group.permissions) {
      const existing = await prisma.platformPermission.findUnique({ where: { key: p.key } });
      const permission = existing
        ? await prisma.platformPermission.update({ where: { key: p.key }, data: { description: p.description } })
        : await prisma.platformPermission.create({ data: { key: p.key, description: p.description } });
      if (!existing) count("platform permissions created");

      const mapped = await prisma.platformPermissionDomainMap.createMany({
        data: [{ permissionId: permission.id, domainId: domain.id }],
        skipDuplicates: true,
      });
      count("platform permission → domain links added", mapped.count);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Platform roles, role permissions, sidebar sections
// ─────────────────────────────────────────────────────────────────────────────
async function seedPlatformRoles() {
  const permissions = await prisma.platformPermission.findMany({ select: { id: true, key: true } });
  const permissionId = Object.fromEntries(permissions.map((p) => [p.key, p.id]));

  for (const name of PLATFORM_SIDEBARS) {
    const existing = await prisma.platformSidebar.findFirst({ where: { name: ciEquals(name) } });
    if (!existing) {
      await prisma.platformSidebar.create({ data: { name } });
      count("platform sidebar sections created");
    }
  }
  const sidebars = await prisma.platformSidebar.findMany();
  const sidebarId = (name) => sidebars.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id;

  const roles = {};
  for (const r of PLATFORM_ROLES) {
    let role = await prisma.platformRole.findUnique({ where: { name: r.name } });
    if (!role) {
      role = await prisma.platformRole.create({
        data: { name: r.name, power: r.power, description: r.description },
      });
      count("platform roles created");
    }
    roles[r.name] = role;

    const links = await prisma.platformRolePermission.createMany({
      data: r.permissions.filter((k) => permissionId[k]).map((k) => ({ roleId: role.id, permissionId: permissionId[k] })),
      skipDuplicates: true,
    });
    count("platform role → permission links added", links.count);

    for (const name of PLATFORM_ROLE_SIDEBARS[r.name] || []) {
      const id = sidebarId(name);
      if (!id) continue;
      const assigned = await prisma.platformSidebarAssignToRole.findFirst({
        where: { roleId: role.id, platformSidebarId: id },
      });
      if (!assigned) {
        await prisma.platformSidebarAssignToRole.create({ data: { roleId: role.id, platformSidebarId: id } });
        count("platform role → sidebar links added");
      }
    }
  }
  return roles;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Super admin & platform staff
// ─────────────────────────────────────────────────────────────────────────────
async function seedPlatformAccounts(roles) {
  const hashed = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.superAdmin.findFirst({ where: { email: ciEquals(SUPER_ADMIN.email) } });
  if (!admin) {
    await prisma.superAdmin.create({
      data: { email: SUPER_ADMIN.email, name: SUPER_ADMIN.name, password: hashed, role: "SUPER_ADMIN", power: "1000" },
    });
    count("super admins created");
  }

  for (const s of PLATFORM_STAFF) {
    const role = roles[s.role];
    const existing = await prisma.platformStaff.findFirst({ where: { email: ciEquals(s.email) } });
    if (!existing && role) {
      await prisma.platformStaff.create({
        data: { email: s.email, name: s.name, password: hashed, roleId: role.id, power: role.power, isActive: true },
      });
      count("platform staff created");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Tenant permission catalog (shared by every tenant → tenantId = null)
// ─────────────────────────────────────────────────────────────────────────────
async function seedTenantPermissions() {
  for (const group of TENANT_PERMISSION_GROUPS) {
    let domain = await prisma.tenantPermissionDomain.findFirst({ where: { name: group.domain, tenantId: null } });
    if (!domain) {
      domain = await prisma.tenantPermissionDomain.create({
        data: { name: group.domain, description: group.description },
      });
      count("tenant permission domains created");
    }

    for (const p of group.permissions) {
      const existing = await prisma.tenantPermission.findUnique({ where: { key: p.key } });
      if (existing) {
        await prisma.tenantPermission.update({
          where: { key: p.key },
          data: { name: p.name, domains: { connect: { id: domain.id } } },
        });
      } else {
        await prisma.tenantPermission.create({
          data: { key: p.key, name: p.name, domains: { connect: { id: domain.id } } },
        });
        count("tenant permissions created");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Feature catalog, feature domains, subscription plans
// ─────────────────────────────────────────────────────────────────────────────
async function fixSpelling() {
  for (const [from, to] of Object.entries(SPELLING_FIXES.featureDomains)) {
    const old = await prisma.tenantFeatureDomain.findUnique({ where: { domain_name: from } });
    const clash = await prisma.tenantFeatureDomain.findUnique({ where: { domain_name: to } });
    if (old && !clash) {
      await prisma.$transaction([
        prisma.tenantFeatureDomain.update({ where: { id: old.id }, data: { domain_name: to } }),
        prisma.subscription_Plan_Domain.updateMany({ where: { domainId: old.id }, data: { domain_name: to } }),
        prisma.tenanFeaturedDomain_assign_features.updateMany({ where: { domainId: old.id }, data: { domain_name: to } }),
      ]);
      count("spelling fixes");
    }
  }
  for (const [from, to] of Object.entries(SPELLING_FIXES.features)) {
    const old = await prisma.feature.findUnique({ where: { feature_name: from } });
    const clash = await prisma.feature.findUnique({ where: { feature_name: to } });
    if (old && !clash) {
      await prisma.$transaction([
        prisma.feature.update({ where: { id: old.id }, data: { feature_name: to } }),
        prisma.tenanFeaturedDomain_assign_features.updateMany({ where: { featureId: old.id }, data: { feature_name: to } }),
      ]);
      count("spelling fixes");
    }
  }
  // Assignment rows store a copy of the feature name; resync any stale copies
  const assignments = await prisma.tenanFeaturedDomain_assign_features.findMany({ include: { feature: true } });
  for (const a of assignments) {
    if (a.feature_name !== a.feature.feature_name) {
      await prisma.tenanFeaturedDomain_assign_features.update({
        where: { id: a.id },
        data: { feature_name: a.feature.feature_name },
      });
      count("spelling fixes");
    }
  }
}

async function seedFeatureCatalog() {
  await fixSpelling();

  const featureByCode = {};
  for (const f of FEATURES) {
    let feature = await prisma.feature.findUnique({ where: { feature_code: f.code } })
      || await prisma.feature.findUnique({ where: { feature_name: f.name } });
    if (!feature) {
      feature = await prisma.feature.create({
        data: { feature_name: f.name, feature_code: f.code, description: f.description, isActive: true },
      });
      count("features created");
    }
    featureByCode[f.code] = feature;
  }

  const domainByName = {};
  for (const d of FEATURE_DOMAINS) {
    let domain = await prisma.tenantFeatureDomain.findUnique({ where: { domain_name: d.name } });
    if (!domain) {
      domain = await prisma.tenantFeatureDomain.create({
        data: { domain_name: d.name, description: d.description, isActive: true },
      });
      count("feature domains created");
    }
    domainByName[d.name] = domain;

    for (const code of d.features) {
      const feature = featureByCode[code];
      if (!feature) continue;
      const linked = await prisma.tenanFeaturedDomain_assign_features.createMany({
        data: [{ domainId: domain.id, domain_name: domain.domain_name, featureId: feature.id, feature_name: feature.feature_name }],
        skipDuplicates: true,
      });
      count("feature → domain links added", linked.count);
    }
  }

  const plans = {};
  for (const p of SUBSCRIPTION_PLANS) {
    let plan = await prisma.subscription_Plan.findFirst({ where: { name: ciEquals(p.name) } });
    if (!plan) {
      plan = await prisma.subscription_Plan.create({
        data: { name: p.name, price: p.price, duration: p.duration, isActive: true },
      });
      count("subscription plans created");

      // Only fill domains for plans this seed created; existing plans are left as configured
      for (const name of p.domains) {
        const domain = domainByName[name];
        if (!domain) continue;
        await prisma.subscription_Plan_Domain.createMany({
          data: [{ subscription_planId: plan.id, subscription_plan_name: plan.name, domainId: domain.id, domain_name: domain.domain_name }],
          skipDuplicates: true,
        });
      }
    }
    plans[p.name] = plan;
  }
  return plans;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Default tenant roles for every tenant
// ─────────────────────────────────────────────────────────────────────────────
async function seedTenantRoles(tenant, permissionId) {
  const roles = {};
  for (const r of tenantRoleTemplate(tenant.tenantType)) {
    let role = await prisma.tenantRole.findFirst({ where: { tenantId: tenant.id, name: r.name } });
    if (!role) {
      role = await prisma.tenantRole.create({ data: { tenantId: tenant.id, name: r.name, power: r.power } });
      count("tenant roles created");
    }
    roles[r.name] = role;

    const links = await prisma.tenantRolePermission.createMany({
      data: r.permissions.filter((k) => permissionId[k]).map((k) => ({ roleId: role.id, permissionId: permissionId[k] })),
      skipDuplicates: true,
    });
    count("tenant role → permission links added", links.count);

    const level = await prisma.levelPower.findFirst({ where: { tenantId: tenant.id, role: r.name } });
    if (!level) {
      await prisma.levelPower.create({
        data: { tenantId: tenant.id, tenantName: tenant.tenantName, role: r.name, power: role.power },
      });
    }
  }
  return roles;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Demo tenant with staff and users
// ─────────────────────────────────────────────────────────────────────────────
async function seedDemoTenant(plans, permissionId) {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const plan = plans[DEMO_TENANT.plan];

  let tenant = await prisma.tenant.findFirst({ where: { tenantUsername: ciEquals(DEMO_TENANT.tenantUsername) } });
  if (!tenant) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan?.duration || 365));

    tenant = await prisma.tenant.create({
      data: {
        tenantName: DEMO_TENANT.tenantName,
        tenantUsername: DEMO_TENANT.tenantUsername,
        tenantType: DEMO_TENANT.tenantType,
        tenantEmail: DEMO_TENANT.tenantEmail,
        tenantPhone: DEMO_TENANT.tenantPhone,
        tenantAddress: DEMO_TENANT.tenantAddress,
        tenantPassword: hashed,
        isActive: true,
        subscription_planId: plan?.id ?? null,
        is_plan_assigned: !!plan,
        subscription_plan_start_date: new Date(),
        subscription_plan_end_date: expiresAt,
      },
    });
    if (plan) {
      await prisma.tenantPlanHistory.create({
        data: { tenant_id: tenant.id, subscription_plan_id: plan.id, plan_name: plan.name, expires_at: expiresAt, status: "ACTIVE" },
      });
    }
    count("demo tenant created");
  }

  const roles = await seedTenantRoles(tenant, permissionId);

  for (const s of DEMO_TENANT.staff) {
    const role = roles[s.role];
    const existing = await prisma.tenantStaff.findFirst({ where: { email: ciEquals(s.email) } });
    if (!existing && role) {
      await prisma.tenantStaff.create({
        data: { tenantId: tenant.id, email: s.email, name: s.name, password: hashed, roleId: role.id, power: role.power },
      });
      count("demo tenant staff created");
    }
  }

  for (const u of DEMO_TENANT.users) {
    const role = roles[u.role];
    const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: ciEquals(u.email) } });
    if (!existing && role) {
      await prisma.user.create({
        data: { tenantId: tenant.id, email: u.email, name: u.name, password: hashed, roleId: role.id },
      });
      count("demo tenant users created");
    }
  }

  return tenant;
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database…\n");

  console.log("→ Platform permissions & domains");
  await seedPlatformPermissions();

  console.log("→ Platform roles, permissions & sidebars");
  const platformRoles = await seedPlatformRoles();

  console.log("→ Super admin & platform staff");
  await seedPlatformAccounts(platformRoles);

  console.log("→ Tenant permission catalog");
  await seedTenantPermissions();
  const tenantPermissions = await prisma.tenantPermission.findMany({ select: { id: true, key: true } });
  const tenantPermissionId = Object.fromEntries(tenantPermissions.map((p) => [p.key, p.id]));

  console.log("→ Feature catalog & subscription plans");
  const plans = await seedFeatureCatalog();

  console.log("→ Demo tenant");
  const demo = await seedDemoTenant(plans, tenantPermissionId);

  console.log("→ Default roles for every tenant");
  const tenants = await prisma.tenant.findMany({ where: { id: { not: demo.id } } });
  for (const tenant of tenants) {
    await seedTenantRoles(tenant, tenantPermissionId);
  }

  console.log("\n✅ Seed finished. Changes:");
  if (!Object.values(stats).some(Boolean)) console.log("   nothing — the database was already up to date");
  for (const [label, n] of Object.entries(stats)) {
    if (n) console.log(`   ${String(n).padStart(4)}  ${label}`);
  }
  console.log("\nDemo accounts are listed in prisma/seed-data.js (password: SEED_DEFAULT_PASSWORD or its default there).");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
