import prisma from "../../../core/config/db.js";

/**
 * 👑 Create Feature
 */
export const createFeature = async (req, res) => {
    try {
        const { feature_name, description, isActive, feature_code } = req.body;

        if (!feature_name || !feature_code) {
            return res.status(400).json({
                success: false,
                message: "Feature name and code are required",
            });
        }

        const upperName = feature_name.trim().toUpperCase();
        const upperCode = feature_code.trim().toUpperCase();

        // 🔍 Case-insensitive and Space-insensitive Check
        const normalizedNewName = upperName.replace(/\s+/g, '').toLowerCase();

        const existingFeatures = await prisma.feature.findMany({
            select: { feature_name: true }
        });

        const isDuplicate = existingFeatures.some(f =>
            f.feature_name.replace(/\s+/g, '').toLowerCase() === normalizedNewName
        );

        if (isDuplicate) {
            return res.status(409).json({
                success: false,
                message: "Feature with this name already exists",
            });
        }

        const feature = await prisma.feature.create({
            data: {
                feature_name: upperName,
                description,
                isActive: isActive !== undefined ? isActive : true,
                feature_code: upperCode,
            },
        });

        res.status(201).json({
            success: true,
            message: "Feature created successfully",
            feature,
        });
    } catch (error) {
        console.error("CREATE FEATURE ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



/**
 * 👑 List All Features
 */
export const listFeatures = async (req, res) => {
    try {
        const features = await prisma.feature.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                domains: {
                    include: {
                        domain: true
                    }
                }
            }
        });

        res.json({
            success: true,
            features,
        });
    } catch (error) {
        console.error("LIST FEATURES ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch features" });
    }
};

/**
 * 👑 Get Feature Details
 */
export const getFeatureDetails = async (req, res) => {
    try {
        const { featureId } = req.params;
        const feature = await prisma.feature.findUnique({
            where: { id: featureId },
            include: {
                domains: {
                    include: {
                        domain: {
                            include: {
                                plans: {
                                    include: {
                                        subscription_plan: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!feature) {
            return res.status(404).json({
                success: false,
                message: "Feature not found",
            });
        }

        res.json({
            success: true,
            feature,
        });
    } catch (error) {
        console.error("GET FEATURE DETAILS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch feature details" });
    }
};

/**
 * 👑 Update Feature
 */
export const updateFeature = async (req, res) => {
    try {
        const { featureId } = req.params;
        const { feature_name, description, isActive, feature_code, feature_type } = req.body;

        const feature = await prisma.feature.update({
            where: { id: featureId },
            data: {
                feature_name,
                description,
                isActive,
                feature_code,
                feature_type
            },
        });

        res.json({
            success: true,
            message: "Feature updated successfully",
            feature,
        });
    } catch (error) {
        console.error("UPDATE FEATURE ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to update feature" });
    }
};

/**
 * 👑 Delete Feature
 */
export const deleteFeature = async (req, res) => {
    try {
        const { featureId } = req.params;

        await prisma.feature.delete({
            where: { id: featureId },
        });

        res.json({
            success: true,
            message: "Feature deleted successfully",
        });
    } catch (error) {
        console.error("DELETE FEATURE ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to delete feature" });
    }
};

/**
 * 👑 Toggle Feature Status
 */
export const toggleFeatureStatus = async (req, res) => {
    try {
        const { featureId } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive must be a boolean",
            });
        }

        await prisma.feature.update({
            where: { id: featureId },
            data: { isActive },
        });

        res.json({
            success: true,
            message: `Feature ${isActive ? "activated" : "deactivated"} successfully`,
        });
    } catch (error) {
        console.error("TOGGLE FEATURE STATUS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to update feature status" });
    }
};
