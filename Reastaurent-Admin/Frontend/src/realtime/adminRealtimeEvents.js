const ADMIN_REALTIME_EVENT_PREFIX = "admin:realtime";

export const ADMIN_REALTIME_EVENT_TYPES = {
  CONNECTION_OPENED: "connection.opened",
  ORDER_UPDATED: "order.updated",
  PAYMENT_UPDATED: "payment.updated",
  CUSTOMER_UPDATED: "customer.updated",
  NOTIFICATION_UPDATED: "notification.updated",
};

const buildBrowserEventName = (type) => `${ADMIN_REALTIME_EVENT_PREFIX}:${type}`;

export const emitAdminRealtimeEvent = (type, detail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(buildBrowserEventName(type), {
      detail,
    })
  );
};

export const subscribeToAdminRealtimeEvent = (type, handler) => {
  if (typeof window === "undefined" || typeof handler !== "function") {
    return () => {};
  }

  const listener = (event) => {
    handler(event.detail);
  };

  window.addEventListener(buildBrowserEventName(type), listener);

  return () => {
    window.removeEventListener(buildBrowserEventName(type), listener);
  };
};
