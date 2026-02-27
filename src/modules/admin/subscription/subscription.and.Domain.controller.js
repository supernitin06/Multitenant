import prisma from "../../../core/config/db.js";


/**
 * Helper: Get all dependencies recursively
 */
const getRecursiveDependencies = async (domainId, visited = new Set()) => {
    if (visited.has(domainId)) return [];
    visited.add(domainId);

    const dependencies = await prisma.domainDependency.findMany({
        where: { domainId },
        include: { requires: true }
    });

    let allDeps = [];
    for (const dep of dependencies) {
        allDeps.push(dep.requires);
        const childDeps = await getRecursiveDependencies(dep.requiresId, visited);
        allDeps = [...allDeps, ...childDeps];
    }
    return allDeps;
};

/**
 * Assign Domain (TenantFeatureDomain) to Subscription Plan
 * Automatically assigns dependencies if they don't exist in the plan.
 */
export const assignDomainToSubscription = async (req, res) => {
    try {
        // 1️⃣ Validate request body
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: "Request body missing"
            });
        }

        let { planId, domainId } = req.body;

        planId = planId?.trim();
        domainId = domainId?.trim();

        if (!planId || !domainId) {
            return res.status(400).json({
                success: false,
                message: "planId and domainId are required"
            });
        }

        // 2️⃣ Check Domain Exists
        const domain = await prisma.tenantFeatureDomain.findUnique({
            where: { id: domainId }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: "Domain not found"
            });
        }

        // 3️⃣ Check Plan Exists
        const plan = await prisma.subscription_Plan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Subscription plan not found"
            });
        }

        // 4️⃣ Get Recursive Dependencies
        const dependencies = await getRecursiveDependencies(domainId);

        if (dependencies.length > 0) {
            // Check which dependencies are NOT yet assigned to this plan
            const assignedDomains = await prisma.subscription_Plan_Domain.findMany({
                where: {
                    subscription_planId: planId,
                    domainId: { in: dependencies.map(d => d.id) }
                },
                select: { domainId: true }
            });

            const assignedIds = new Set(assignedDomains.map(a => a.domainId));
            const missingDependencies = dependencies.filter(d => !assignedIds.has(d.id));

            if (missingDependencies.length > 0) {
                // Unique missing dependencies by ID
                const uniqueMissing = Array.from(
                    new Map(missingDependencies.map(d => [d.id, d])).values()
                );

                return res.status(400).json({
                    success: false,
                    message: "This domain has dependencies. Please assign the required domains first before adding this domain.",
                    requiredDomains: uniqueMissing.map(d => ({
                        id: d.id,
                        name: d.domain_name
                    }))
                });
            }
        }

        // 5️⃣ Check if already assigned
        const existingAssignment =
            await prisma.subscription_Plan_Domain.findFirst({
                where: {
                    subscription_planId: planId,
                    domainId: domainId
                }
            });

        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: "Domain already assigned to this plan"
            });
        }

        // 6️⃣ Create Assignment
        const assignment =
            await prisma.subscription_Plan_Domain.create({
                data: {
                    subscription_planId: planId,
                    subscription_plan_name: plan.name,
                    domainId: domain.id,
                    domain_name: domain.domain_name
                }
            });

        return res.status(200).json({
            success: true,
            message: "Domain successfully assigned to subscription plan",
            data: assignment
        });

    } catch (error) {
        console.error("ASSIGN DOMAIN TO PLAN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to assign domain to subscription plan"
        });
    }

};


/**
 * Remove Domain from Subscription Plan
 */
export const removeDomainFromSubscription = async (req, res) => {
    try {
        if (!req.body) return res.status(400).json({ success: false, message: "Request body missing" });
        const { planId, domainId } = req.body;

        if (!planId || !domainId) {
            return res.status(400).json({ success: false, message: "planId and domainId required" });
        }

        const domainRecord = await prisma.subscription_Plan_Domain.findUnique({
            where: {
                subscription_planId_domainId: {
                    subscription_planId: planId,
                    domainId,
                },
            },
        });

        if (!domainRecord) {
            return res.status(404).json({ success: false, message: "Domain not assigned to this plan" });
        }

        await prisma.subscription_Plan_Domain.delete({
            where: {
                subscription_planId_domainId: {
                    subscription_planId: planId,
                    domainId,
                },
            },
        });

        res.json({
            success: true,
            message: "Domain removed from plan successfully",
        });
    } catch (error) {
        console.error("REMOVE DOMAIN FROM PLAN ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to remove domain from plan" });
    }
};


/**
 * Get All Domains in a Subscription Plan
 */
export const getAllDomainsInSubscription = async (req, res) => {
    try {
        const { planId } = req.query; // Use query param for GET

        if (!planId) {
            return res.status(400).json({ success: false, message: "planId is required as a query parameter" });
        }

        // Check if plan exists
        const plan = await prisma.subscription_Plan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Subscription Plan not found",
            });
        }

        const domainsRaw = await prisma.subscription_Plan_Domain.findMany({
            where: { subscription_planId: planId },
            include: {
                domain: {
                    include: {
                        features: {
                            include: { feature: true }
                        }
                    }
                }
            }
        });

        // Flatten the data for a cleaner response
        const flattenedDomains = domainsRaw.map(planDomain => {
            const domainInfo = planDomain.domain;
            return {
                domainId: planDomain.domainId,
                domain_name: planDomain.domain_name,
                isActive: planDomain.isActive,
                details: {
                    price: domainInfo?.price,
                    description: domainInfo?.description,
                },
                features: domainInfo?.features.map(f => ({
                    featureId: f.featureId,
                    feature_name: f.feature_name,
                    feature_code: f.feature.feature_code,
                    description: f.feature.description,
                    isActive: f.feature.isActive
                })) || []
            };
        });

        res.json({
            success: true,
            message: "Domains and features in plan fetched successfully",
            count: flattenedDomains.length,
            domains: flattenedDomains,
        });
    } catch (error) {
        console.error("GET DOMAINS AND FEATURES IN PLAN ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to get domains and features in plan" });
    }
};


