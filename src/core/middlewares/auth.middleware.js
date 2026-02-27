import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

export const authMiddleware = async (req, res, next) => {
  // 🍪 Check cookies first, then Authorization header
  let token = req.cookies?.token;
  console.log("Auth Debug - Token ffffffffff:", token);

  if (!token) {
    const authHeader = req.headers.authorization;
    console.log("Auth Debug - Auth Header:", authHeader);
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log("Auth Debug - Token from Header:", token ? "FOUND" : "MISSING");
    } else {
      console.log("Auth Debug - No valid Bearer token found in Header");
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication hdcb bdckj b" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === "SUPER_ADMIN") {
      // ✅ Handle Super Admin
      console.log("Auth Debug - Decoded:", decoded);
      const admin = await prisma.superAdmin.findUnique({
        where: { id: decoded.userId },
      });
      console.log("Auth Debug - Found Admin:", admin ? admin.id : "Not Found");

      if (!admin) {
        return res.status(401).json({ message: "Admin inactive or not found" });
      }

      req.user = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        type: "SUPER_ADMIN",
      };
    }
    else if (decoded.type === "PLATFORM_STAFF") {
      // ✅ Handle Global Management Staff
      const staff = await prisma.platformStaff.findUnique({
        where: { id: decoded.userId },
      });

      if (!staff || staff.isActive === false) {
        return res.status(401).json({ message: "Staff inactive or not found" });
      }

      req.user = {
        id: staff.id,
        roleId: staff.roleId,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        role_name: staff.role_name,
        power: staff.power,
        type: "PLATFORM_STAFF",
      };
    }
    else if (decoded.type === "TENANT_STAFF") {
      // ✅ Handle Tenant Specific Staff
      const staff = await prisma.tenantStaff.findUnique({
        where: { id: decoded.userId },
      });

      if (!staff || staff.isActive === false) {
        return res.status(401).json({ message: "Tenant staff inactive or not found" });
      }

      req.user = {
        id: staff.id,
        tenantId: staff.tenantId,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        role_name: staff.role_name,
        power: staff.power,
        type: "TENANT_STAFF",
      };
    }
    else if (decoded.type === "USER") {
      // ✅ Handle Regular User (Simplified)
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.isActive === false) {
        return res.status(401).json({ message: "User inactive or not found" });
      }

      req.user = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        type: "USER",
      };
    }
    else if (decoded.type === "TENANT") {
      // ✅    Handle Tenant Account Login
      const tenantId = decoded.tenantId || decoded.userId; // Fallback for various token versions
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return res.status(401).json({ message: "Tenant inactive or not found" });
      }

      req.user = {
        id: tenant.id,
        tenantId: tenant.id,
        email: tenant.tenantEmail,
        name: tenant.tenantName,
        role: tenant.role || "TENANT_ADMIN",
        type: "TENANT",
      };
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};


