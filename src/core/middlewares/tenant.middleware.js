import prisma from "../config/db.js";

/**
 * Middleware to resolve tenant context from URL path
 * Usage: app.use("/api/v1/:tenantName", resolveTenant, ...)
 */
export const resolveTenant = async (req, res, next) => {
    try {
        const { tenantName } = req.params;

        if (!tenantName) {
            return res.status(400).json({
                success: false,
                message: "Tenant context is missing in URL"
            });
        }

        const tenant = await prisma.tenant.findFirst({
            where: {
                tenantName: {
                    equals: tenantName,
                    mode: 'insensitive'
                }
            },
            include: {
                subscription_plan: true
            }
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: `Tenant '${tenantName}' not found`
            });
        }

        if (!tenant.isActive) {
            return res.status(403).json({
                success: false,
                message: "Tenant environment is not active"
            });
        }

        // Attach to request
        req.tenant = tenant;

        next();
    } catch (error) {
        console.error("Tenant Resolution Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error during tenant resolution"
        });
    }
};
