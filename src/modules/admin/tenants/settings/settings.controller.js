import prisma from "../../../../core/config/db.js";
import { createAuditLog } from "../../../../platform/audit/audit.service.js";
import { AUDIT_ACTIONS } from "../../../../platform/audit/audit.constants.js";

/**
 * 🏫 TENANT ADMIN
 * Get all tenant settings
 */
export const getTenantSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const settings = await prisma.tenantSetting.findMany({
      where: { tenantId },
    });

    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    res.json({
      success: true,
      settings: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
    });
  }
};

/**
 * 🏫 TENANT ADMIN
 * Update / Create a tenant setting
 */
export const upsertTenantSetting = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Setting key is required",
      });
    }

    await prisma.tenantSetting.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
      update: { value },
      create: {
        tenantId,
        key,
        value,
      },
    });

    // 🔍 Audit
    await createAuditLog({
      actorType: "TENANT_USER",
      tenantId,
      action: AUDIT_ACTIONS.TENANT_SETTING_UPDATED,
      entity: "TENANT_SETTING",
      meta: { key, value },
      req,
    });

    res.json({
      success: true,
      message: "Setting saved",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to save setting",
    });
  }
};