import crypto from "crypto";
import prisma from "../../../core/config/db.js";
import { razorpay } from "../../../core/config/razorpay_config.js";

/**
 * 👑 Create Razorpay Order for Subscription
 * POST /api/v1/subscription-payment/create-order
 */
export const createSubscriptionOrder = async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ success: false, message: "planId is required" });
        }

        const plan = await prisma.subscription_Plan.findUnique({
            where: { id: planId },
        });

        if (!plan || !plan.isActive) {
            return res.status(404).json({ success: false, message: "Active subscription plan not found" });
        }

        // Razorpay amount is in paise
        const amount = Math.round(plan.price * 100);

        const options = {
            amount,
            currency: "INR",
            receipt: `rcpt_${planId.substring(0, 8)}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            key: process.env.RAZORPAY_KEY_ID,
            planName: plan.name
        });

    } catch (error) {
        console.error("CREATE RAZORPAY ORDER ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order",
            error: error
        });
    }
};

/**
 * 👑 Verify Payment and Activate Subscription
 * POST /api/v1/subscription-payment/verify
 */
/**
 * 👑 Create a static QR Code for Subscription
 * POST /api/v1/subscription-payment/create-qr
 */
export const createSubscriptionQr = async (req, res) => {
    try {
        const { planId } = req.body;
        // Securely get tenantId from authenticated user
        const tenantId = req.user?.tenantId || req.user?.id;

        console.log("DEBUG: createSubscriptionQr for planId:", planId, "tenantId:", tenantId);

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant context required" });
        }

        const checkexistingSubscription = await prisma.tenant.findUnique({ where: { id: tenantId } });

        if (!checkexistingSubscription) {
            return res.status(404).json({ success: false, message: "Tenant not found" });
        }

        if (checkexistingSubscription.subscription_planId && checkexistingSubscription.isActive) {
            return res.status(400).json({ success: false, message: "Your subscription already exists" });
        }

        if (!planId) {
            return res.status(400).json({ success: false, message: "planId is required" });
        }

        const plan = await prisma.subscription_Plan.findUnique({ where: { id: planId } });
        console.log("DEBUG: Plan found:", plan ? plan.name : "NOT FOUND");

        if (!plan || !plan.isActive) {
            return res.status(404).json({ success: false, message: "Active subscription plan not found" });
        }

        console.log("DEBUG: Sending request to Razorpay for QR...");
        const qrCode = await razorpay.qrCode.create({
            type: "upi_qr",
            name: `Plan_${(plan.name || "").substring(0, 20)}`, // Limit name length
            usage: "single_payment",
            fixed_amount: true,
            payment_amount: Math.round(plan.price * 100), // in paise
            description: `Pay for ${(plan.name || "").substring(0, 20)}`,
        });
        console.log("DEBUG: Razorpay QR created successfully ID:", qrCode.id);

        res.json({
            success: true,
            qr_id: qrCode.id,
            image_url: qrCode.image_url,
            payload: qrCode.payload
        });
    } catch (error) {
        console.error("QR CREATE ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create QR code",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

/**
 * 👑 Check QR payment status (Polling)
 * GET /api/v1/subscription-payment/check-status/:qrId
 */
export const checkPaymentStatus = async (req, res) => {
    try {
        const { qrId } = req.params;
        const { planId, tenantId: queryTenantId } = req.query; // Accept tenantId from query
        const tenantId = req.user?.tenantId || req.user?.id || queryTenantId;

        if (!qrId || !planId) {
            return res.status(400).json({ success: false, message: "qrId and planId are required" });
        }

        // Fetch payments for this QR code
        const payments = await razorpay.qrCode.fetchAllPayments(qrId);

        // Safely access items
        const items = payments?.items || [];

        // Check if any payment is captured/authorized
        const successfulPayment = items.find(p => p.status === 'captured' || p.status === 'authorized');

        if (successfulPayment) {
            // Activate subscription
            const plan = await prisma.subscription_Plan.findUnique({ where: { id: planId } });
            if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

            const result = await prisma.$transaction(async (tx) => {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + (plan.duration || 30));

                const updatedTenant = await tx.tenant.update({
                    where: { id: tenantId },
                    data: {
                        subscription_planId: planId,
                        subscription_plan_start_date: startDate,
                        subscription_plan_end_date: endDate,
                        isActive: true,
                        is_plan_assigned: true,
                    },
                });

                await tx.tenantPlanHistory.create({
                    data: {
                        tenant_id: tenantId,
                        subscription_plan_id: planId,
                        plan_name: plan.name,
                        expires_at: endDate,
                        status: "ACTIVE",
                    },
                });

                return updatedTenant;
            });

            return res.json({
                success: true,
                message: "Payment successful and plan activated",
                tenant: { id: result.id, plan: plan.name, expiry: result.subscription_plan_end_date },
                paymentId: successfulPayment.id
            });
        }

        res.json({ success: false, message: "Payment pending" });

    } catch (error) {
        console.error("CHECK STATUS ERROR:", error);
        res.status(500).json({ success: false, message: "Error checking payment status", error: error.message });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            planId,
            tenantId: bodyTenantId, // Accept tenantId from body if auth missing
        } = req.body;

        // From authMiddleware OR body (fallback)
        const tenantId = req.user?.tenantId || req.user?.id || bodyTenantId;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
            return res.status(400).json({ success: false, message: "Missing required payment details" });
        }

        if (!tenantId) {
            console.log("Verify Payment Debug - No Tenant Context");
            // Optional: Fail here if you want to strictly enforce it, but for now we proceed or fail later
        }

        // 1. Signature Verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment signature verification failed" });
        }

        // 2. Fetch Plan Details
        const plan = await prisma.subscription_Plan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            return res.status(404).json({ success: false, message: "Subscription plan not found" });
        }

        // 3. Update Tenant and Create Plan History (Transaction)
        const result = await prisma.$transaction(async (tx) => {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (plan.duration || 30));

            const updatedTenant = await tx.tenant.update({
                where: { id: tenantId },
                data: {
                    subscription_planId: planId,
                    subscription_plan_start_date: startDate,
                    subscription_plan_end_date: endDate,
                    isActive: true, // Activate tenant on payment
                    is_plan_assigned: true,
                },
            });

            const history = await tx.tenantPlanHistory.create({
                data: {
                    tenant_id: tenantId,
                    subscription_plan_id: planId,
                    plan_name: plan.name,
                    expires_at: endDate,
                    status: "ACTIVE",
                    // We can store payment info in meta if needed, though schema doesn't have paymentId
                },
            });

            return { updatedTenant, history };
        });

        res.json({
            success: true,
            message: "Payment verified and subscription activated successfully",
            tenant: {
                id: result.updatedTenant.id,
                plan: plan.name,
                expiry: result.updatedTenant.subscription_plan_end_date
            }
        });

    } catch (error) {
        console.error("VERIFY PAYMENT ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to verify payment and activate subscription" });
    }
};

