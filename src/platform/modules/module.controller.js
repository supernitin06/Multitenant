import prisma from "../../core/config/db.js";
import { AUDIT_ACTIONS } from "../audit/audit.constants.js";
import { createAuditLog } from "../audit/audit.service.js";

/**
 * 👑 SUPER ADMIN
 * Create a new module
 */
export const createModule = async (req, res) => {
  try {
    const { key, name, isCommon = false, tenantTypes = [] } = req.body;

    if (!key || !name) {
      return res.status(400).json({
        success: false,
        message: "Module key and name are required",
      });
    }

    const module = await prisma.$transaction(async (tx) => {
      const createdModule = await tx.module.create({
        data: { key, name, isCommon },
      });

      if (!isCommon && tenantTypes.length > 0) {
        await tx.moduleTenantType.createMany({
          data: tenantTypes.map((type) => ({
            moduleId: createdModule.id,
            tenantType: type,
          })),
        });

        // 🔍 Audit tenant-type mapping
        await createAuditLog({
          actorType: "SUPER_ADMIN",
          action: AUDIT_ACTIONS.MODULE_ASSIGNED_TENANT_TYPE,
          entity: "MODULE",
          entityId: createdModule.id,
          meta: { tenantTypes },
          req,
        });
      }

      // 🔍 Audit module creation
      await createAuditLog({
        actorType: "SUPER_ADMIN",
        action: AUDIT_ACTIONS.MODULE_CREATED,
        entity: "MODULE",
        entityId: createdModule.id,
        meta: { key, name, isCommon },
        req,
      });

      return createdModule;
    });

    res.status(201).json({
      success: true,
      message: "Module created successfully",
      module,
    });
  } catch (error) {
    console.error("CREATE MODULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create module",
    });
  }
};

/**
 * 👑 SUPER ADMIN
 * Enable / Disable module for a tenant
 */
/**
 * 👑 SUPER ADMIN
 * Enable / Disable a module for a tenant
 */
export const toggleTenantModule = async (req, res) => {
  try {
    const { tenantId, moduleId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "enabled must be boolean",
      });
    }

    // ❗ Ensure module is active
    const module = await prisma.module.findFirst({
      where: {
        id: moduleId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!module) {
      return res.status(400).json({
        success: false,
        message: "Cannot enable an archived module",
      });
    }

    const tenantModule = await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
      update: { enabled },
      create: { tenantId, moduleId, enabled },
    });

    await createAuditLog({
      actorType: "SUPER_ADMIN",
      action: enabled
        ? AUDIT_ACTIONS.MODULE_ENABLED
        : AUDIT_ACTIONS.MODULE_DISABLED,
      entity: "MODULE",
      entityId: moduleId,
      meta: { tenantId, enabled },
      req,
    });

    res.json({
      success: true,
      message: enabled
        ? "Module enabled for tenant"
        : "Module disabled for tenant",
      tenantModule,
    });
  } catch (error) {
    console.error("TOGGLE TENANT MODULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tenant module",
    });
  }
};




/**
 * 👑 SUPER ADMIN
 * Get enabled modules for a tenant
 */
export const getTenantModules = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const modules = await prisma.module.findMany({
      where: {
        isDeleted: false,
        tenants: {
          some: { tenantId },
        },
      },
      select: {
        id: true,
        key: true,
        name: true,
        tenants: {
          where: { tenantId },
          select: { enabled: true },
        },
      },
    });

    res.json({
      success: true,
      modules: modules.map((m) => ({
        id: m.id,
        key: m.key,
        name: m.name,
        enabled: m.tenants[0]?.enabled ?? false,
      })),
    });
  } catch (error) {
    console.error("GET TENANT MODULES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenant modules",
    });
  }
};


/**
 * 👑 SUPER ADMIN
 * List all modules (optional tenantType filter)
 */
export const listModules = async (req, res) => {
  try {
    const { tenantType, includeArchived } = req.query;

    const where = {
      ...(includeArchived ? {} : { isDeleted: false }),
      ...(tenantType
        ? {
            OR: [
              { isCommon: true },
              {
                tenantTypes: {
                  some: { tenantType },
                },
              },
            ],
          }
        : {}),
    };

    const modules = await prisma.module.findMany({
      where,
      include: {
        tenantTypes: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({ success: true, modules });
  } catch (error) {
    console.error("LIST MODULES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch modules",
    });
  }
};


/**
 * 👑 SUPER ADMIN make common module
 * Update module to be common
 */
export const makeModuleCommon = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const module = await prisma.module.update({
      where: { id: moduleId },
      data: { isCommon: true },
    });
    // 🔍 Audit
    await createAuditLog({
      actorType: "SUPER_ADMIN",
      action: AUDIT_ACTIONS.MODULE_MADE_COMMON,
      entity: "MODULE",
      entityId: moduleId,
      meta: {},
      req,
    });
    res.json({
      success: true,
      message: "Module updated to common",
      module,
    });
  } catch (error) {
    console.error("MAKE MODULE COMMON ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update module",
    });
  } 
};

/**
 * 👑 SUPER ADMIN get common modules
 */

export const getCommonModules = async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { isCommon: true },
      orderBy: { name: "asc" },
    });
    res.json({
      success: true,
      modules,
    });
  } catch (error) {
    console.error("GET COMMON MODULES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch common modules",
    });
  }
};




/**
 * 👑 SUPER ADMIN
 * Delete a module
 * Cascades to tenant modules and tenant-type mappings
 */


// export const deleteModule = async (req, res) => {

//   try {
//     const { moduleId } = req.params;

//     if (!moduleId) {
//       return res.status(400).json({
//         success: false,
//         message: "moduleId is required",
//       });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1️⃣ Check existence FIRST
//       const exists = await tx.module.findUnique({
//         where: { id: moduleId },
//         select: { id: true },
//       });

//       if (!exists) {
//         return null;
//       }

//       // 2️⃣ Delete dependencies
//       await tx.planModule.deleteMany({
//         where: { moduleId },
//       });

//       await tx.tenantModule.deleteMany({
//         where: { moduleId },
//       });

//       // 3️⃣ Delete module safely
//       await tx.module.deleteMany({
//         where: { id: moduleId },
//       });

//       return exists;
//     });

//     if (!result) {
//       return res.status(404).json({
//         success: false,
//         message: "Module not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Module deleted successfully",
//     });
//   } catch (error) {
//     console.error("DELETE MODULE ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete module",
//     });
//   }
// };


//**
// delete all modules - FOR TESTING PURPOSES ONLY


/**
 * Archives Modules 
 */
export const archiveModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: "moduleId is required",
      });
    }

    const result = await prisma.$transaction(async (tx) => {

      // 1️⃣ Check module exists & not already archived
      const module = await tx.module.findFirst({
        where: {
          id: moduleId,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!module) return null;

      // 2️⃣ Disable module for all tenants (DO NOT delete)
      await tx.tenantModule.updateMany({
        where: { moduleId },
        data: { enabled: false },
      });

      // 3️⃣ Remove module from future plans
      await tx.planModule.deleteMany({
        where: { moduleId },
      });

      // 4️⃣ Archive module (soft delete)
      await tx.module.update({
        where: { id: moduleId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return module;
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Module not found or already archived",
      });
    }

    res.json({
      success: true,
      message: "Module archived successfully",
    });

  } catch (error) {
    console.error("ARCHIVE MODULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive module",
    });
  }
};

/**
 * Restore Archived Module 
 */
export const restoreModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module || !module.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Module not found or not archived",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.module.update({
        where: { id: moduleId },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      // Optional: auto-enable for common modules
      if (module.isCommon) {
        await tx.tenantModule.updateMany({
          where: { moduleId },
          data: { enabled: true },
        });
      }
    });

    res.json({
      success: true,
      message: "Module restored successfully",
    });
  } catch (error) {
    console.error("RESTORE MODULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore module",
    });
  }
};




export const deleteAllModules = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "This action is disabled in production",
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.planModule.deleteMany({});
      await tx.tenantModule.deleteMany({});
      await tx.moduleTenantType.deleteMany({});
      await tx.module.deleteMany({});
    });

    res.json({
      success: true,
      message: "All modules deleted (DEV only)",
    });
  } catch (error) {
    console.error("DELETE ALL MODULES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete all modules",
    });
  }
};


