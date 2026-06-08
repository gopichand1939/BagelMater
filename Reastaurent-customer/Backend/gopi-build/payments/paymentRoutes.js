const express = require("express");
const {
  createCheckoutSession,
  createPaymentIntent,
  confirmCheckoutSession,
  confirmPayment,
  stripeWebhook,
} = require("./paymentController");
const { requireCustomerAuth } = require("../auth/customerAuthMiddleware");

const router = express.Router();

router.post("/create-payment-intent", requireCustomerAuth, createPaymentIntent);
router.post("/create-checkout-session", requireCustomerAuth, createCheckoutSession);
router.post("/confirm-payment", requireCustomerAuth, confirmPayment);
router.post("/confirm-checkout-session", requireCustomerAuth, confirmCheckoutSession);
router.post("/webhook", stripeWebhook);

module.exports = router;
