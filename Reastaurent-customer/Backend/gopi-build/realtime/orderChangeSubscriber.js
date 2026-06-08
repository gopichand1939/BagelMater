const { Client } = require("pg");
const { ORDER_CHANGES_CHANNEL } = require("./orderEvents");

const RECONNECT_DELAY_MS = 3000;

const getRealtimeDatabaseConfig = () => {
  const realtimeDatabaseUrl =
    process.env.REALTIME_DATABASE_URL || process.env.DATABASE_URL || "";

  if (realtimeDatabaseUrl) {
    return {
      connectionString: realtimeDatabaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "postgres",
  };
};

const parseOrderChangePayload = (payload) => {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    console.error("Failed to parse order change payload:", error);
    return null;
  }
};

const startOrderChangeSubscriber = ({ onOrderChange }) => {
  let subscriber = null;
  let reconnectTimer = null;
  let isStopped = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (isStopped || reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  };

  const handleNotification = ({ payload }) => {
    console.log("[order-events][customer-backend] Raw DB notification:", payload);

    const change = parseOrderChangePayload(payload);

    if (!change) {
      console.warn("[order-events][customer-backend] Skipping invalid DB notification payload");
      return;
    }

    console.log("[order-events][customer-backend] Parsed order change:", change);
    console.log("[order-events][customer-backend] Forwarding order change to WebSocket gateway");
    onOrderChange(change);
  };

  const connect = async () => {
    if (isStopped) {
      return;
    }

    clearReconnectTimer();
    console.log("[order-events][customer-backend] Connecting DB LISTEN subscriber...");

    const nextSubscriber = new Client(getRealtimeDatabaseConfig());

    nextSubscriber.on("notification", handleNotification);
    nextSubscriber.on("error", (error) => {
      console.error("Order change subscriber error:", error);
      if (subscriber === nextSubscriber) {
        subscriber = null;
      }
      scheduleReconnect();
    });
    nextSubscriber.on("end", () => {
      if (subscriber === nextSubscriber) {
        subscriber = null;
      }

      if (!isStopped) {
        console.warn("Order change subscriber disconnected. Reconnecting...");
        scheduleReconnect();
      }
    });

    try {
      await nextSubscriber.connect();
      await nextSubscriber.query(`LISTEN ${ORDER_CHANGES_CHANNEL}`);
      subscriber = nextSubscriber;
      console.log(
        `[order-events][customer-backend] Listening for order changes on channel "${ORDER_CHANGES_CHANNEL}"`
      );
    } catch (error) {
      console.error("Failed to start order change subscriber:", error);
      try {
        await nextSubscriber.end();
      } catch (closeError) {
        console.error("Failed to close order change subscriber after startup error:", closeError);
      }
      scheduleReconnect();
    }
  };

  void connect();

  return {
    stop: async () => {
      isStopped = true;
      clearReconnectTimer();

      if (subscriber) {
        try {
          await subscriber.end();
        } catch (error) {
          console.error("Failed to stop order change subscriber:", error);
        } finally {
          subscriber = null;
        }
      }
    },
  };
};

module.exports = {
  startOrderChangeSubscriber,
};
