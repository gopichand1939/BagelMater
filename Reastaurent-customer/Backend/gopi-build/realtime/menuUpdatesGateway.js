const { WebSocket, WebSocketServer } = require("ws");
const customerAuthModel = require("../auth/customerAuthModel");
const { verifyAccessToken } = require("../auth/customerTokenService");

const MENU_SOCKET_PATH = "/ws";
const MENU_SOCKET_MESSAGE_TYPES = {
  CONNECTED: "menu.connected",
  UPDATED: "menu.updated",
  ORDER_UPDATED: "order.updated",
  NOTIFICATION_UPDATED: "notification.updated",
};

const resolveCustomerFromSocketRequest = async (request) => {
  try {
    const requestUrl = new URL(request.url || MENU_SOCKET_PATH, "http://localhost");
    const accessToken = requestUrl.searchParams.get("token");

    if (!accessToken) {
      return null;
    }

    const payload = verifyAccessToken(accessToken);
    const customer = await customerAuthModel.getCustomerForSessionValidation(payload.sub);

    if (
      !customer ||
      Number(customer.is_active) !== 1 ||
      customer.current_session_id !== payload.sid ||
      !customer.session_expires_at ||
      new Date(customer.session_expires_at) <= new Date()
    ) {
      return null;
    }

    return customerAuthModel.sanitizeCustomer(customer);
  } catch (_error) {
    return null;
  }
};

const createMenuUpdatesGateway = (server) => {
  const webSocketServer = new WebSocketServer({
    server,
    path: MENU_SOCKET_PATH,
  });

  webSocketServer.on("connection", async (socket, request) => {
    const customer = await resolveCustomerFromSocketRequest(request);
    socket.customerId = customer?.id || null;

    console.log(
      `[menu-events][customer-backend] WebSocket client connected. Total clients: ${webSocketServer.clients.size}. customerId=${socket.customerId || "guest"}`
    );

    socket.send(
      JSON.stringify({
        type: MENU_SOCKET_MESSAGE_TYPES.CONNECTED,
        payload: {
          connectedAt: new Date().toISOString(),
          customerId: socket.customerId,
        },
      })
    );

    socket.on("close", () => {
      console.log(
        `[menu-events][customer-backend] WebSocket client disconnected. Total clients: ${webSocketServer.clients.size}`
      );
    });
  });

  const broadcastMenuUpdate = (change) => {
    console.log(
      `[menu-events][customer-backend] Broadcasting menu update to ${webSocketServer.clients.size} client(s):`,
      change
    );

    const message = JSON.stringify({
      type: MENU_SOCKET_MESSAGE_TYPES.UPDATED,
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

  const broadcastOrderUpdate = (change) => {
    console.log(
      `[order-events][customer-backend] Broadcasting order update to ${webSocketServer.clients.size} client(s):`,
      change
    );

    const message = JSON.stringify({
      type: MENU_SOCKET_MESSAGE_TYPES.ORDER_UPDATED,
      payload: {
        ...change,
        broadcastAt: new Date().toISOString(),
      },
    });

    for (const client of webSocketServer.clients) {
      if (
        client.readyState === WebSocket.OPEN &&
        (!change?.customerId || Number(client.customerId) === Number(change.customerId))
      ) {
        client.send(message);
      }
    }
  };

  const broadcastNotificationUpdate = (change) => {
    console.log(
      `[notification-events][customer-backend] Broadcasting notification update to ${webSocketServer.clients.size} client(s):`,
      change
    );

    const message = JSON.stringify({
      type: MENU_SOCKET_MESSAGE_TYPES.NOTIFICATION_UPDATED,
      payload: {
        ...change,
        broadcastAt: new Date().toISOString(),
      },
    });

    for (const client of webSocketServer.clients) {
      if (
        client.readyState === WebSocket.OPEN &&
        Number(client.customerId) === Number(change?.customerId)
      ) {
        client.send(message);
      }
    }
  };

  return {
    broadcastMenuUpdate,
    broadcastOrderUpdate,
    broadcastNotificationUpdate,
    getClientCount: () => webSocketServer.clients.size,
  };
};

module.exports = {
  MENU_SOCKET_PATH,
  MENU_SOCKET_MESSAGE_TYPES,
  createMenuUpdatesGateway,
};
