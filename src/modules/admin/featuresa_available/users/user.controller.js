import prisma from "../../../../core/config/db.js";
import bcrypt from "bcryptjs";
import logger from "../../../../core/utils/logger.js";
import { writeAuditLog } from "../../../../platform/audit/audit.helper.js";
/**
 * TENANT ADMIN
 * Create user
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, roleId } = req.body;
    const tenantId = req.user.tenantId;
    const createdBy = req.user?.id ?? null;

    logger.info(`[createUser] start - user=${createdBy} tenant=${tenantId} email=${email} roleId=${roleId}`);

    if (!email || !password || !roleId) {
      logger.warn(`[createUser] validation failed - missing fields user=${createdBy} tenant=${tenantId}`);
      return res.status(400).json({ message: "All fields required" });
    }

    const hashed = await bcrypt.hash(password, 10);
    logger.debug(`[createUser] password hashed for email=${email}`);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        tenantId,
        roleId,
      },
    });

    logger.info(`[createUser] success - created user id=${user.id} email=${user.email} tenant=${tenantId}`);

    // Create audit log (non-blocking for main flow)
    try {
      const actorType = tenantId ? "TENANT_USER" : "SUPER_ADMIN";
      await prisma.auditLog.create({
        data: {
          actorId: createdBy,
          actorType,
          tenantId,
          action: "USER_CREATED",
          entity: "USER",
          entityId: user.id,
          meta: { email, roleId },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
      });
      logger.info(`[createUser] audit logged for user id=${user.id}`);
    } catch (auditErr) {
      logger.error(`[createUser] failed to create audit log: ${auditErr.message}`, auditErr);
    }

    res.status(201).json({ success: true, user });
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
    const { roleId, isActive } = req.body;

    const tenantId = req.user.tenantId;
    const adminId = req.user.id;

    // ---------- Validate input ----------
    if (roleId === undefined && isActive === undefined) {
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

    if (roleId !== undefined) {
      updateData.roleId = roleId;
      changedFields.push("roleId");
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      changedFields.push("isActive");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // ---------- Audit Log ----------
    await writeAuditLog({
      actorType: "TENANT_USER",
      userId: adminId,
      tenantId,
      action: "USER_UPDATED_BY_ADMIN",
      entity: "USER",
      entityId: userId,
      meta: {
        updatedFields: changedFields,
        values: updateData,
      },
      req,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        roleId: updatedUser.roleId,
        isActive: updatedUser.isActive,
      },
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
    const tenantId = req.user.tenantId;
    const { name, password } = req.body;

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
      actorType: "TENANT_USER",
      userId,
      tenantId,
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

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await writeAuditLog({
      actorType: "TENANT_USER",
      userId: req.user.id,
      tenantId,
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

    const hashedUsers = await Promise.all(
      users.map(async (u) => ({
        email: u.email,
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
      actorType: "TENANT_USER",
      userId: req.user.id,
      tenantId,
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



export const getUsers = async (req, res) => {
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

        // security-related info (safe)
        loginAttempts: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            success: true,
            reason: true,
            ipAddress: true,
            createdAt: true,
          },
        },
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
 * List users
 */
export const listUsers = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const users = await prisma.user.findMany({
      where: { tenantId },
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
      actorType: "TENANT_USER",
      userId: actorUserId,
      tenantId,
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
      actorType: "TENANT_USER",
      userId: actorUserId,
      tenantId,
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





