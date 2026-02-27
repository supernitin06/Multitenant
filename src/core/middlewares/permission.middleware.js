import prisma from "../config/db.js";
import {
  getCachedPermissions,
  setCachedPermissions
} from "../cache/permission.cache.js";

export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const { roleId, role, type } = req.user;

      // 1️⃣ Bypass for high-level roles
      if (role === "SUPER_ADMIN" || role === "TENANT_ADMIN") {
        return next();
      }

      if (!roleId) {
        return res.status(403).json({ success: false, message: "Role not found" });
      }

      // 2️⃣ Try cache first
      let permissions = getCachedPermissions(roleId);

      if (!permissions) {
        // 3️⃣ Load from DB
        let permissionKeys = [];

        if (type === "PLATFORM_STAFF") {
          const rolePermissions = await prisma.platformRolePermission.findMany({
            where: { roleId },
            include: { permission: true },
          });
          permissionKeys = rolePermissions.map((rp) => rp.permission.key);
        } else {
          // Default to tenant side
          const rolePermissions = await prisma.tenantRolePermission.findMany({
            where: { roleId },
            include: { permission: true },
          });
          permissionKeys = rolePermissions.map((rp) => rp.permission.key);
        }

        setCachedPermissions(roleId, permissionKeys);
        permissions = new Set(permissionKeys);
      }

      // 4️⃣ Check permission
      if (permissions.has(permissionKey)) {
        return next();
      }

      // 5️⃣ Permission Denied
      let permName = permissionKey;
      if (type === "PLATFORM_STAFF") {
        const def = await prisma.platformPermission.findUnique({ where: { key: permissionKey }, select: { description: true } });
        if (def) permName = def.description || permissionKey;
      } else {
        const def = await prisma.tenantPermission.findUnique({ where: { key: permissionKey }, select: { description: true } });
        if (def) permName = def.description || permissionKey;
      }

      return res.status(403).json({
        success: false,
        message: `Your role does not have permission '${permName}'`,
      });

    } catch (err) {
      console.error("Permission Middleware Error:", err);
      res.status(500).json({ success: false, message: "Permission validation failed" });
    }
  };
};

