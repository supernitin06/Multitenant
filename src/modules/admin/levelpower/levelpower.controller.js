import prisma from "../../../core/config/db.js";
import logger from "../../../core/utils/logger.js";

/**
 * Create Level Power entry
 */
export const createLevelPower = async (req, res) => {
    try {
        const { tenantId, tenantName, role_name, power } = req.body;

        if (!tenantId || !role_name || !power) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const newLevelPower = await prisma.levelPower.create({
            data: {
                tenantId,
                tenantName: tenantName || "Unknown",
                role_name,
                power: power.toString(),
            },
        });

        res.status(201).json({ success: true, data: newLevelPower });
    } catch (error) {
        logger.error("Create LevelPower Error:", error);
        res.status(500).json({ success: false, message: "Failed to create level power" });
    }
};

/**
 * Get all Level Powers
 */
export const getLevelPowers = async (req, res) => {
    try {
        const { tenantId } = req.query;
        const where = tenantId ? { tenantId } : {};

        const levelPowers = await prisma.levelPower.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        res.json({ success: true, data: levelPowers });
    } catch (error) {
        logger.error("Get LevelPowers Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch level powers" });
    }
};

/**
 * Update Level Power
 */
export const updateLevelPower = async (req, res) => {
    try {
        const { id } = req.params;
        const { power, role_name } = req.body;

        const updated = await prisma.levelPower.update({
            where: { id },
            data: {
                power: power ? power.toString() : undefined,
                role_name,
            },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        logger.error("Update LevelPower Error:", error);
        res.status(500).json({ success: false, message: "Failed to update level power" });
    }
};

/**
 * Delete Level Power
 */
export const deleteLevelPower = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.levelPower.delete({
            where: { id },
        });

        res.json({ success: true, message: "Level power deleted successfully" });
    } catch (error) {
        logger.error("Delete LevelPower Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete level power" });
    }
};
