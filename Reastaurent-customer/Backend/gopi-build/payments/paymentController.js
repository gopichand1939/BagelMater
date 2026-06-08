const paymentService = require("./paymentService");

const createPaymentIntent = async (req, res) => {
  try {
    const { amount, orderId = null } = req.body;

    const result = await paymentService.createPaymentIntent({
      amount,
      orderId,
      customer: req.customer,
    });

    return res.status(200).json({
      success: true,
      message: "Payment intent created successfully",
      data: {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        payment: result.payment,
      },
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create payment intent",
    });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const { orderId, checkoutPayload, successUrl, cancelUrl } = req.body;

    const result = await paymentService.createCheckoutSession({
      orderId,
      checkoutPayload,
      successUrl,
      cancelUrl,
      customer: req.customer,
    });

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create checkout session",
    });
  }
};

const stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Stripe signature is required",
      });
    }

    const event = await paymentService.handleStripeWebhook({
      rawBody: req.rawBody,
      signature,
    });

    return res.status(200).json({
      received: true,
      type: event.type,
    });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to handle Stripe webhook",
    });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const result = await paymentService.confirmPayment({
      paymentIntentId,
      customer: req.customer,
    });

    return res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
};

const confirmCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const result = await paymentService.confirmCheckoutSession({
      sessionId,
      customer: req.customer,
    });

    return res.status(200).json({
      success: true,
      message: "Checkout confirmed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error confirming checkout session:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to confirm checkout session",
    });
  }
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  confirmCheckoutSession,
  stripeWebhook,
};
