const { WebSocket, WebSocketServer } = require("ws");
const adminModel = require("../Login/adminModel");
const { verifyAccessToken } = require("../Login/tokenService");

const ADMIN_SOCKET_PATH = "/ws";
const ADMIN_SOCKET_MESSAGE_TYPES = {
  CONNECTED: "admin.connected",
  ORDER_UPDATED: "order.updated",
  PAYMENT_UPDATED: "payment.updated",
  CUSTOMER_UPDATED: "customer.updated",
  NOTIFICATION_UPDATED: "notification.updated",
};

const resolveAdminFromSocketRequest = async (request) => {
  try {
    const requestUrl = new URL(request.url || ADMIN_SOCKET_PATH, "http://localhost");
    const accessToken = requestUrl.searchParams.get("token");

    if (!accessToken) {
      return null;
    }

    const payload = verifyAccessToken(accessToken);
    const admin = await adminModel.getAdminForSessionValidation(payload.sub);
    const session = await adminModel.getSessionByAdminAndSessionId(payload.sub, payload.sid);

    if (
      !admin ||
      Number(admin.is_active) !== 1 ||
      !session ||
      !session.session_expires_at ||
      new Date(session.session_expires_at) <= new Date()
    ) {
      return null;
    }

    return adminModel.sanitizeAdmin(admin);
  } catch (_error) {
    return null;
  }
};

const createAdminUpdatesGateway = (server) => {
  const webSocketServer = new WebSocketServer({
    server,
    path: ADMIN_SOCKET_PATH,
  });

  const heartbeatInterval = setInterval(() => {
    webSocketServer.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        console.log(`[admin-events][backend] Terminating inactive WebSocket client. adminId=${socket.adminId || "unknown"}`);
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  webSocketServer.on("connection", async (socket, request) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    const admin = await resolveAdminFromSocketRequest(request);

    if (!admin?.id) {
      socket.close(1008, "Unauthorized");
      return;
    }

    socket.adminId = admin.id;

    console.log(
      `[admin-events][backend] WebSocket client connected. Total clients: ${webSocketServer.clients.size}. adminId=${socket.adminId}`
    );

    socket.send(
      JSON.stringify({
        type: ADMIN_SOCKET_MESSAGE_TYPES.CONNECTED,
        payload: {
          connectedAt: new Date().toISOString(),
          adminId: socket.adminId,
        },
      })
    );

    socket.on("close", () => {
      console.log(
        `[admin-events][backend] WebSocket client disconnected. Total clients: ${webSocketServer.clients.size}`
      );
    });
  });

  webSocketServer.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  const broadcast = (type, change, logPrefix) => {
    console.log(
      `${logPrefix} Broadcasting ${type} to ${webSocketServer.clients.size} client(s):`,
      change
    );

    const message = JSON.stringify({
      type,
      payload: {
        ...change,
        broadcastAt: new Date().toISOString(),
      },
    });

    for (const client of webSocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  };

  return {
    broadcastOrderUpdate: (change) =>
      broadcast(ADMIN_SOCKET_MESSAGE_TYPES.ORDER_UPDATED, change, "[order-events][admin]"),
    broadcastPaymentUpdate: (change) =>
      broadcast(
        ADMIN_SOCKET_MESSAGE_TYPES.PAYMENT_UPDATED,
        change,
        "[payment-events][admin]"
      ),
    broadcastCustomerUpdate: (change) =>
      broadcast(
        ADMIN_SOCKET_MESSAGE_TYPES.CUSTOMER_UPDATED,
        change,
        "[customer-events][admin]"
      ),
    broadcastNotificationUpdate: (change) =>
      broadcast(
        ADMIN_SOCKET_MESSAGE_TYPES.NOTIFICATION_UPDATED,
        change,
        "[notification-events][admin]"
      ),
    getClientCount: () => webSocketServer.clients.size,
  };
};

module.exports = {
  ADMIN_SOCKET_PATH,
  ADMIN_SOCKET_MESSAGE_TYPES,
  createAdminUpdatesGateway,
};
