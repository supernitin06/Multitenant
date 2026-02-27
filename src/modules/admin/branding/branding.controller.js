import prisma from "../../../core/config/db.js";
import { uploadImage } from "./upload.service.js";
import { writeAuditLog } from "../../../platform/audit/audit.helper.js";
import { AUDIT_ACTIONS } from "../../../platform/audit/audit.constants.js";
import logger from "../../../core/utils/logger.js";

/**
 * 🏫 TENANT ADMIN
 * Upload branding assets (logo / favicon)
 */
export const uploadBranding = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const actorUserId = req.user.id;
    const file = req.file;
    const { type } = req.body; // logo | favicon

    logger.info(
      `[uploadBranding] start actorUser=${actorUserId} tenant=${tenantId} type=${type}`
    );

    // ---------- Validation ----------
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    if (!["logo", "favicon"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branding type. Allowed: logo, favicon",
      });
    }

    // Optional: file type validation
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    // ---------- Upload ----------
    const folder = `tenants/${tenantId}/branding/${type}`;
    const imageUrl = await uploadImage(file, folder);

    const updateData =
      type === "logo"
        ? { logoUrl: imageUrl }
        : { faviconUrl: imageUrl };

    const profile = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    // ---------- Audit ----------
    await writeAuditLog({
      actorType: "TENANT_USER",
      userId: actorUserId,
      tenantId,
      action: AUDIT_ACTIONS.TENANT_BRANDING_UPDATED,
      entity: "TENANT_PROFILE",
      entityId: profile.id,
      meta: {
        type,
        imageUrl,
      },
      req,
    });

    logger.info(
      `[uploadBranding] success tenant=${tenantId} type=${type}`
    );

    res.json({
      success: true,
      imageUrl,
      profile,
    });
  } catch (err) {
    logger.error(
      `[uploadBranding] error: ${err.message}`,
      err
    );

    res.status(500).json({
      success: false,
      message: "Failed to upload branding",
    });
  }
};
