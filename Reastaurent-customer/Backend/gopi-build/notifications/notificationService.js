const notificationModel = require("./notificationModel");
const { publishNotificationChangeSafely } = require("../realtime/notificationEvents");

const buildNotificationPayload = (notification) => ({
  entity: "notification",
  action: "created",
  entityId: notification.id,
  notificationId: notification.id,
  customerId: notification.customer_id,
  entityData: notification,
});

const publishCreatedNotification = async (notification) => {
  if (!notification) {
    return null;
  }

  await publishNotificationChangeSafely(buildNotificationPayload(notification));
  return notification;
};

const isStripeOrderAwaitingPayment = (change) => {
  const paymentMethod = String(change?.entityData?.payment_method || "").toLowerCase();
  const paymentStatus = String(change?.entityData?.payment_status || "").toLowerCase();

  return paymentMethod === "stripe" && paymentStatus !== "paid";
};

const shouldSkipOrderChangeNotification = (change) => {
  if (change?.entity !== "order") {
    return false;
  }

  if (change?.action === "created" && isStripeOrderAwaitingPayment(change)) {
    return true;
  }

  if (change?.action !== "updated") {
    return false;
  }

  if (String(change?.changeCategory || "").toLowerCase() === "payment_status") {
    return !(
      String(change?.entityData?.payment_method || "").toLowerCase() === "stripe" &&
      String(change?.entityData?.payment_status || "").toLowerCase() === "paid"
    );
  }

  const orderStatus = String(change?.entityData?.order_status || "").toLowerCase();
  const paymentStatus = String(change?.entityData?.payment_status || "").toLowerCase();
  const paymentMethod = String(change?.entityData?.payment_method || "").toLowerCase();

  return paymentMethod === "stripe" && orderStatus === "placed" && paymentStatus !== "paid";
};

const createCustomerNotification = async ({
  customerId,
  notificationType,
  entity,
  action,
  entityId = null,
  title,
  message,
  redirectPath = "notifications",
  source = "customer-backend",
  payload = {},
}) => {
  const notification = await notificationModel.createNotification({
    customerId,
    notificationType,
    entity,
    action,
    entityId,
    title,
    message,
    redirectPath,
    source,
    payload,
  });

  return publishCreatedNotification(notification);
};

const createCustomerNotificationSafely = async (input) => {
  try {
    return await createCustomerNotification(input);
  } catch (error) {
    console.error("Failed to create customer notification:", error);
    return null;
  }
};

const buildOrderNotificationContent = (change) => {
  const orderNumber =
    change?.entityData?.order_number || `#${change?.orderId || change?.entityId || ""}`;
  const orderStatus = String(change?.entityData?.order_status || "placed").replace(
    /_/g,
    " "
  );

  if (change?.action === "created") {
    return {
      notificationType: "order_alert",
      title: `Order ${orderNumber} placed`,
      message: `Your order ${orderNumber} was placed successfully.`,
      redirectPath: "orders",
    };
  }

  if (
    change?.action === "updated" &&
    String(change?.entityData?.payment_method || "").toLowerCase() === "stripe" &&
    String(change?.entityData?.payment_status || "").toLowerCase() === "paid"
  ) {
    return {
      notificationType: "order_alert",
      title: `Order ${orderNumber} placed`,
      message: `Your order ${orderNumber} was placed successfully.`,
      redirectPath: "orders",
    };
  }

  if (change?.action === "updated") {
    return {
      notificationType: "order_alert",
      title: `Order ${orderNumber} updated`,
      message: `Your order ${orderNumber} is now ${orderStatus}.`,
      redirectPath: "orders",
    };
  }

  if (change?.action === "deleted") {
    return {
      notificationType: "order_alert",
      title: `Order ${orderNumber} removed`,
      message: `Order ${orderNumber} is no longer available.`,
      redirectPath: "orders",
    };
  }

  return {
    notificationType: "order_alert",
    title: `Order ${orderNumber} activity`,
    message: `There is a new update for order ${orderNumber}.`,
    redirectPath: "orders",
  };
};

const createNotificationFromOrderChange = async (change) => {
  if (!change?.customerId) {
    return null;
  }

  if (shouldSkipOrderChangeNotification(change)) {
    return null;
  }

  const content = buildOrderNotificationContent(change);

  return createCustomerNotification({
    customerId: change.customerId,
    notificationType: content.notificationType,
    entity: "order",
    action: change.action || "updated",
    entityId: change.orderId || change.entityId || null,
    title: content.title,
    message: content.message,
    redirectPath: content.redirectPath,
    source: change.source || "customer-backend",
    payload: change,
  });
};

const createNotificationFromOrderChangeSafely = async (change) => {
  try {
    return await createNotificationFromOrderChange(change);
  } catch (error) {
    console.error("Failed to create customer order notification:", error);
    return null;
  }
};

module.exports = {
  createCustomerNotification,
  createCustomerNotificationSafely,
  createNotificationFromOrderChange,
  createNotificationFromOrderChangeSafely,
};
