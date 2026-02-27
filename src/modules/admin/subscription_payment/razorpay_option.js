import Razorpay from "razorpay";const options = {
  key: response.key,
  amount: response.amount,
  currency: "INR",
  name: "Your Company Name",
  description: "Subscription Plan Payment",
  order_id: response.orderId,

  method: {
    upi: true,
    card: false,
    netbanking: false,
    wallet: false,
  },

  handler: function (payment) {
    // Send payment details to backend
    verifyPayment(payment);
  },
};

const rzp = new Razorpay(options);
rzp.open();
