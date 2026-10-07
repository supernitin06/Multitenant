import prisma from "../../../../core/config/db.js";
import bcrypt from "bcryptjs";
import logger from "../../../../core/utils/logger.js";
import { writeAuditLog, auditActor } from "../../../../platform/audit/audit.helper.js";
const TENANT_ADMIN_POWER = 100;
const requesterPower = (user) => (user.type === "TENANT" ? TENANT_ADMIN_POWER : (user.power ?? 0));

/**
 * Make sure a role belongs to this tenant and ranks below the requester.
 * Returns { role } or { error: [status, message] }.
 */
const resolveAssignableRole = async (req, roleId) => {
  const role = await prisma.tenantRole.findFirst({ where: { id: roleId, tenantId: req.user.tenantId } });
  if (!role) return { error: [404, "Role not found in this organisation"] };
  if (req.user.type !== "TENANT" && role.power >= requesterPower(req.user)) {
    return { error: [403, `You can only assign roles below your own level (${requesterPower(req.user)}).`] };
  }
  return { role };
};

const userSelect = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  roleId: true,
  role: { select: { id: true, name: true, power: true } },
  failedLoginCount: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Create user
 * Body: { name?, email, password, roleId }
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, roleId } = req.body;
    const tenantId = req.user.tenantId;

    if (!email || !password || !roleId) {
      return res.status(400).json({ success: false, message: "Email, password and role are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const { error } = await resolveAssignableRole(req, roleId);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });

    const normalisedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { tenantId, email: normalisedEmail } });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists" });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: normalisedEmail,
        password: await bcrypt.hash(password, 10),
        tenantId,
        roleId,
      },
      select: userSelect,
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: "USER_CREATED",
      entity: "USER",
      entityId: user.id,
      meta: { email: user.email, roleId },
      req,
    });

    res.status(201).json({ success: true, message: "User created", user });
  } catch (err) {
    logger.error(`[createUser] error creating user: ${err.message}`, err);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
};


/**
 * Update user by admin
 */
export const updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId, isActive, name, password } = req.body;

    const tenantId = req.user.tenantId;
    const adminId = req.user.id;

    // ---------- Validate input ----------
    if (roleId === undefined && isActive === undefined && name === undefined && !password) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update",
      });
    }

    // ---------- Fetch user ----------
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ❌ Prevent admin deactivating themselves
    if (user.id === adminId && isActive === false) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // ---------- Build update payload ----------
    const updateData = {};
    const changedFields = [];

    if (req.user.type !== "TENANT" && user.roleId) {
      const current = await prisma.tenantRole.findUnique({ where: { id: user.roleId }, select: { power: true } });
      if (current && current.power >= requesterPower(req.user)) {
        return res.status(403).json({ success: false, message: "You cannot edit a user at or above your own level." });
      }
    }

    if (roleId !== undefined && roleId !== user.roleId) {
      const { error } = await resolveAssignableRole(req, roleId);
      if (error) return res.status(error[0]).json({ success: false, message: error[1] });
      updateData.roleId = roleId;
      changedFields.push("roleId");
    }

    if (name !== undefined) {
      updateData.name = name;
      changedFields.push("name");
    }

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      updateData.password = await bcrypt.hash(password, 10);
      updateData.failedLoginCount = 0;
      updateData.lockedUntil = null;
      changedFields.push("password");
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      changedFields.push("isActive");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });

    // ---------- Audit Log ----------
    await writeAuditLog({
      ...auditActor(req.user),
      action: "USER_UPDATED_BY_ADMIN",
      entity: "USER",
      entityId: userId,
      meta: { updatedFields: changedFields },
      req,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UPDATE USER BY ADMIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};




/**
 * TENANT USER
 * Update own profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, password } = req.body;

    if (req.user.type !== "USER") {
      return res.status(400).json({ success: false, message: "Only user accounts can be edited here" });
    }

    const updateData = {};
    const changedFields = [];

    // Update name
    if (name !== undefined) {
      updateData.name = name;
      changedFields.push("name");
    }

    // Update password
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
      updateData.failedLoginCount = 0;
      updateData.lockedUntil = null;
      changedFields.push("password");
    }

    if (changedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 🔍 Audit Log (NON-BLOCKING)
    await writeAuditLog({
      ...auditActor(req.user),
      action: "USER_PROFILE_UPDATED",
      entity: "USER",
      entityId: userId,
      meta: {
        updatedFields: changedFields,
      },
      req,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "User",
      },
    });
  } catch (error) {
    console.error("UPDATE MY PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};


/**
 * TENANT ADMIN
 * Restore user
 */
export const restoreUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenantId;

    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: "USER_RESTORED",
      entity: "USER",
      entityId: userId,
      req,
    });

    res.json({
      success: true,
      message: "User restored successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to restore user",
    });
  }
};


export const bulkCreateUsers = async (req, res) => {
  try {
    const { users } = req.body;
    const tenantId = req.user.tenantId;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "Users array required" });
    }

    const roleIds = [...new Set(users.map((u) => u.roleId).filter(Boolean))];
    const roleCount = await prisma.tenantRole.count({ where: { id: { in: roleIds }, tenantId } });
    if (roleCount !== roleIds.length) {
      return res.status(400).json({ success: false, message: "One or more roles do not belong to this organisation" });
    }

    const hashedUsers = await Promise.all(
      users.map(async (u) => ({
        email: String(u.email).trim().toLowerCase(),
        name: u.name,
        password: await bcrypt.hash(u.password, 10),
        roleId: u.roleId,
        tenantId,
      }))
    );

    const result = await prisma.user.createMany({
      data: hashedUsers,
      skipDuplicates: true,
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: "BULK_USER_CREATED",
      entity: "USER",
      meta: { count: result.count },
      req,
    });

    res.status(201).json({
      success: true,
      created: result.count,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Bulk create failed" });
  }
};



/**
 * TENANT ADMIN
 * List users
 */
export const listUsers = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/** * TENANT ADMIN
 * Get user details
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenantId;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,

        role: {
          select: {
            id: true,
            name: true,
          },
        },
        failedLoginCount: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GET USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};


/**
 * TENANT ADMIN
 * Activate / Deactivate user
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const tenantId = req.user.tenantId;
    const actorUserId = req.user.id;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    // Prevent self-disable
    if (userId === actorUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own status",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entity: "USER",
      entityId: userId,
      meta: { isActive },
      req,
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("TOGGLE USER STATUS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status",
    });
  }
};

/**
 * TENANT ADMIN
 * Soft delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenantId;
    const actorUserId = req.user.id;

    // Prevent self-delete
    if (userId === actorUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    await writeAuditLog({
      ...auditActor(req.user),
      action: "USER_SOFT_DELETED",
      entity: "USER",
      entityId: userId,
      req,
    });

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};





