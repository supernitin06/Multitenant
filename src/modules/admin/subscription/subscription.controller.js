import prisma from "../../../core/config/db.js";

/**
 * 👑 Create Subscription Plan
 */
export const createSubscription = async (req, res) => {
  try {
    console.log("DEBUG: createPlan called. req.body:", req.body);
    if (!req.body) {
      console.error("CREATE PLAN ERROR: req.body is undefined/null");
      return res.status(400).json({
        success: false,
        message: "Request body is missing",
      });
    }
    const { name, price, duration, isActive } = req.body || {};

    if (!name || price === undefined || duration === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and duration are required",
      });
    }

    const upperName = name.trim().toUpperCase();

    // 🔍 Case-insensitive and Space-insensitive Check (Prevent duplicate plan names)
    const normalizedNewName = upperName.replace(/\s+/g, '').toLowerCase();

    const existingPlans = await prisma.subscription_Plan.findMany({
      select: { name: true }
    });

    const isDuplicate = existingPlans.some(p =>
      p.name.replace(/\s+/g, '').toLowerCase() === normalizedNewName
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: `Plan with name '${upperName}' already exists`,
      });
    }

    const plan = await prisma.subscription_Plan.create({
      data: {
        name: upperName,
        price: parseFloat(price),
        duration: parseInt(duration),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      plan,
    });
  } catch (error) {
    console.error("CREATE PLAN ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 👑 List All Subscription Plans
 */
export const listSubscriptions = async (req, res) => {
  try {
    const plans = await prisma.subscription_Plan.findMany({
      include: {
        domains: {
          include: {
            domain: {
              include: {
                features: {
                  include: {
                    feature: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("LIST PLANS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch plans" });
  }
};

/**
 * 👑 Get Plan Details
 */
export const getSubscriptionDetails = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const plan = await prisma.subscription_Plan.findUnique({
      where: { id: subscriptionId },
      include: {
        tenants: true,
        domains: true,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("GET PLAN DETAILS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch plan details" });
  }
};

/**
 * 👑 Update Subscription Plan
 */
export const updateSubscription = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is missing",
      });
    }
    const { subscriptionId } = req.params;
    const { name, price, duration, isActive } = req.body || {};

    const plan = await prisma.subscription_Plan.update({
      where: { id: subscriptionId },
      data: {
        name,
        price: price !== undefined ? parseFloat(price) : undefined,
        duration: duration !== undefined ? parseInt(duration) : undefined,
        isActive,
      },
    });

    res.json({
      success: true,
      message: "Subscription plan updated successfully",
      plan,
    });
  } catch (error) {
    console.error("UPDATE PLAN ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update plan" });
  }
};

/**
 * 👑 Delete Subscription Plan
 */
export const deleteSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Check if any tenants are using this plan
    const tenantsCount = await prisma.tenant.count({
      where: { subscription_planId: subscriptionId },
    });

    if (tenantsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete plan: It is currently assigned to one or more tenants",
      });
    }

    await prisma.subscription_Plan.delete({
      where: { id: subscriptionId },
    });

    res.json({
      success: true,
      message: "Subscription plan deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PLAN ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to delete plan" });
  }
};

/**
 * 👑 Assign Plan to Tenant
 */
export const assignSubscriptionToTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    const plan = await prisma.subscription_Plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive plan",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Tenant
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscription_plan_start_date: new Date(),
          subscription_plan_end_date: new Date(new Date().getTime() + (plan.duration || 30) * 24 * 60 * 60 * 1000),
          subscription_planId: planId,
          isActive: true,
          is_plan_assigned: true,
        },
      });

      // 2. Create History Record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan.duration || 30));

      const history = await tx.tenantPlanHistory.create({
        data: {
          tenant_id: tenantId,
          subscription_plan_id: planId,
          plan_name: plan.name,
          expires_at: expiresAt,
          status: "ACTIVE",
        },
      });

      return { tenant: updatedTenant, history };
    });

    res.json({
      success: true,
      message: "Plan assigned to tenant successfully",
      tenant: result.tenant,
      history: result.history,
    });
  } catch (error) {
    console.error("ASSIGN PLAN ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 👑 Setup Default Plans
 */
export const setupDefaultSubscriptions = async (req, res) => {
  try {
    const defaultPlans = [
      { name: "TRIAL", price: 0, duration: 30 },
      { name: "BASIC", price: 99, duration: 30 },
      { name: "PREMIUM", price: 299, duration: 30 },
    ];

    const results = [];
    for (const plan of defaultPlans) {
      const existing = await prisma.subscription_Plan.findFirst({
        where: { name: plan.name },
      });

      if (!existing) {
        const created = await prisma.subscription_Plan.create({
          data: plan,
        });
        results.push(created);
      }
    }

    res.json({
      success: true,
      message: "Default plans setup completed",
      created: results,
    });
  } catch (error) {
    console.error("SETUP DEFAULT PLANS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to setup default plans" });
  }
};




