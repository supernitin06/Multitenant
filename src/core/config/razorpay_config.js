// config/razorpay.js
import Razorpay from "razorpay";

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
    console.warn("⚠️ RAZORPAY WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payments will not work.");
}

export const razorpay = new Razorpay({
    key_id: key_id || "placeholder_id",
    key_secret: key_secret || "placeholder_secret",
});
