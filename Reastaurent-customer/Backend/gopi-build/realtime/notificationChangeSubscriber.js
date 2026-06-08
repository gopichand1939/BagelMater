const { Client } = require("pg");
const { NOTIFICATION_CHANGES_CHANNEL } = require("./notificationEvents");

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

const parseNotificationChangePayload = (payload) => {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    console.error("Failed to parse customer notification change payload:", error);
    return null;
  }
};

const startNotificationChangeSubscriber = ({ onNotificationChange }) => {
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
    console.log("[notification-events][customer-backend] Raw DB notification:", payload);

    const change = parseNotificationChangePayload(payload);

    if (!change) {
      console.warn("[notification-events][customer-backend] Skipping invalid DB notification");
      return;
    }

    console.log("[notification-events][customer-backend] Parsed notification change:", change);
    onNotificationChange(change);
  };

  const connect = async () => {
    if (isStopped) {
      return;
    }

    clearReconnectTimer();
    console.log("[notification-events][customer-backend] Connecting DB LISTEN subscriber...");

    const nextSubscriber = new Client(getRealtimeDatabaseConfig());

    nextSubscriber.on("notification", handleNotification);
    nextSubscriber.on("error", (error) => {
      console.error("Customer notification change subscriber error:", error);
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
        console.warn("Customer notification change subscriber disconnected. Reconnecting...");
        scheduleReconnect();
      }
    });

    try {
      await nextSubscriber.connect();
      await nextSubscriber.query(`LISTEN ${NOTIFICATION_CHANGES_CHANNEL}`);
      subscriber = nextSubscriber;
      console.log(
        `[notification-events][customer-backend] Listening for notification changes on channel "${NOTIFICATION_CHANGES_CHANNEL}"`
      );
    } catch (error) {
      console.error("Failed to start customer notification change subscriber:", error);
      try {
        await nextSubscriber.end();
      } catch (closeError) {
        console.error(
          "Failed to close customer notification subscriber after startup error:",
          closeError
        );
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
          console.error("Failed to stop customer notification subscriber:", error);
        } finally {
          subscriber = null;
        }
      }
    },
  };
};

module.exports = {
  startNotificationChangeSubscriber,
};
