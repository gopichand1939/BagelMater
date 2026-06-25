import { useEffect, useRef } from "react";
import { ADMIN_UPDATES_WS_URL } from "../Utils/Constant";
import { getAccessToken } from "../Utils/authStorage";
import { ensureFreshAccessToken } from "../Utils/fetchWithRefreshToken";
import {
  ADMIN_REALTIME_EVENT_TYPES,
  emitAdminRealtimeEvent,
} from "./adminRealtimeEvents";

const RECONNECT_DELAY_MS = 2000;
const MAX_CONSECUTIVE_FAILURES = 6;
const isLocalHostName = (host = "") =>
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(String(host || ""));

const buildAuthenticatedWebSocketUrl = (baseUrl, accessToken) => {
  if (!baseUrl || !accessToken) {
    return "";
  }

  try {
    const nextUrl = new URL(
      baseUrl,
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    );

    nextUrl.searchParams.set("token", accessToken);

    if (/^https?:/i.test(nextUrl.protocol)) {
      nextUrl.protocol = nextUrl.protocol.replace(/^http/i, "ws");
    }

    return nextUrl.toString();
  } catch (_error) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}token=${encodeURIComponent(accessToken)}`;
  }
};

const withAlternateProtocol = (urlValue) => {
  try {
    const nextUrl = new URL(
      urlValue,
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    );

    if (nextUrl.protocol === "ws:") {
      nextUrl.protocol = "wss:";
      return nextUrl.toString();
    }

    return "";
  } catch (_error) {
    return "";
  }
};

export const useAdminRealtimeUpdates = ({
  onOrderUpdate,
  onPaymentUpdate,
  onCustomerUpdate,
  onNotificationUpdate,
}) => {
  const orderUpdateRef = useRef(onOrderUpdate || (() => {}));
  const paymentUpdateRef = useRef(onPaymentUpdate || (() => {}));
  const customerUpdateRef = useRef(onCustomerUpdate || (() => {}));
  const notificationUpdateRef = useRef(onNotificationUpdate || (() => {}));

  useEffect(() => {
    orderUpdateRef.current = onOrderUpdate || (() => {});
  }, [onOrderUpdate]);

  useEffect(() => {
    paymentUpdateRef.current = onPaymentUpdate || (() => {});
  }, [onPaymentUpdate]);

  useEffect(() => {
    customerUpdateRef.current = onCustomerUpdate || (() => {});
  }, [onCustomerUpdate]);

  useEffect(() => {
    notificationUpdateRef.current = onNotificationUpdate || (() => {});
  }, [onNotificationUpdate]);

  useEffect(() => {
    if (!ADMIN_UPDATES_WS_URL) {
      return undefined;
    }

    let socket = null;
    let reconnectTimer = null;
    let isDisposed = false;
    let consecutiveFailures = 0;
    let triedProtocolFallback = false;
    let pendingWsBaseOverride = "";

    const scheduleReconnect = () => {
      if (isDisposed || reconnectTimer) {
        return;
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      const accessToken = getAccessToken();
      const socketUrl = buildAuthenticatedWebSocketUrl(
        pendingWsBaseOverride || ADMIN_UPDATES_WS_URL,
        accessToken
      );

      if (!accessToken || !socketUrl) {
        scheduleReconnect();
        return;
      }

      socket = new WebSocket(socketUrl);

      socket.addEventListener("open", () => {
        consecutiveFailures = 0;
        emitAdminRealtimeEvent(ADMIN_REALTIME_EVENT_TYPES.CONNECTION_OPENED, {
          connectedAt: new Date().toISOString(),
        });
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === ADMIN_REALTIME_EVENT_TYPES.ORDER_UPDATED) {
            emitAdminRealtimeEvent(ADMIN_REALTIME_EVENT_TYPES.ORDER_UPDATED, message.payload);
            orderUpdateRef.current(message.payload);
          }

          if (message.type === ADMIN_REALTIME_EVENT_TYPES.PAYMENT_UPDATED) {
            emitAdminRealtimeEvent(
              ADMIN_REALTIME_EVENT_TYPES.PAYMENT_UPDATED,
              message.payload
            );
            paymentUpdateRef.current(message.payload);
          }

          if (message.type === ADMIN_REALTIME_EVENT_TYPES.CUSTOMER_UPDATED) {
            emitAdminRealtimeEvent(
              ADMIN_REALTIME_EVENT_TYPES.CUSTOMER_UPDATED,
              message.payload
            );
            customerUpdateRef.current(message.payload);
          }

          if (message.type === ADMIN_REALTIME_EVENT_TYPES.NOTIFICATION_UPDATED) {
            emitAdminRealtimeEvent(
              ADMIN_REALTIME_EVENT_TYPES.NOTIFICATION_UPDATED,
              message.payload
            );
            notificationUpdateRef.current(message.payload);
          }
        } catch (error) {
          console.error("Failed to parse admin realtime message:", error);
        }
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });

      socket.addEventListener("close", (event) => {
        if (isDisposed) {
          return;
        }

        consecutiveFailures += 1;

        if (event.code === 1008) {
          void ensureFreshAccessToken().finally(() => {
            scheduleReconnect();
          });
          return;
        }

        if (!triedProtocolFallback) {
          try {
            const candidate = new URL(
              socketUrl,
              typeof window === "undefined" ? "http://localhost" : window.location.origin
            );
            const remoteHost = !isLocalHostName(candidate.hostname);
            if (remoteHost && candidate.protocol === "ws:") {
              const alternate = withAlternateProtocol(socketUrl);
              if (alternate) {
                triedProtocolFallback = true;
                pendingWsBaseOverride = alternate.replace(/\?.*$/, "");
                scheduleReconnect();
                return;
              }
            }
          } catch (_error) {
            // ignored; continue normal reconnect path
          }
        }

        scheduleReconnect();
      });
    };

    connect();

    return () => {
      isDisposed = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (socket) {
        socket.close();
      }
    };
  }, []);
};
