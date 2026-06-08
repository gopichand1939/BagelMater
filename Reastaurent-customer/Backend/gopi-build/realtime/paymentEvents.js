const db = require("../config/db");

const PAYMENT_CHANGES_CHANNEL = "payment_changes";

const buildPaymentChangePayload = ({
  entity = "payment",
  action,
  entityId = null,
  paymentId = null,
  orderId = null,
  customerId = null,
  ...rest
}) => ({
  entity,
  action,
  entityId,
  paymentId,
  orderId,
  customerId,
  ...rest,
  emittedAt: new Date().toISOString(),
  source: "customer-backend",
});

const publishPaymentChange = async (change) => {
  const payload = buildPaymentChangePayload(change);

  await db.query("SELECT pg_notify($1, $2)", [
    PAYMENT_CHANGES_CHANNEL,
    JSON.stringify(payload),
  ]);

  console.log("[payment-events][customer-backend] Published payment change:", payload);

  return payload;
};

const publishPaymentChangeSafely = async (change) => {
  try {
    await publishPaymentChange(change);
  } catch (error) {
    console.error("Failed to publish customer payment event:", error);
  }
};

module.exports = {
  PAYMENT_CHANGES_CHANNEL,
  publishPaymentChange,
  publishPaymentChangeSafely,
};
