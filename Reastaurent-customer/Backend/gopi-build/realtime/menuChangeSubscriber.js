const { Client } = require("pg");
const { resetMenuCache } = require("../cache/menuCache");
const { MENU_CHANGES_CHANNEL, parseMenuChangePayload } = require("./menuEvents");

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

const warnIfUsingPoolerForRealtime = () => {
  const realtimeDatabaseUrl =
    process.env.REALTIME_DATABASE_URL || process.env.DATABASE_URL || "";

  if (/\-pooler\./i.test(realtimeDatabaseUrl)) {
    console.warn(
      "[menu-events][customer-backend] REALTIME_DATABASE_URL is using a pooler connection. LISTEN/NOTIFY may not work through Neon/PgBouncer poolers. Use a direct database connection string for realtime."
    );
  }
};

const startMenuChangeSubscriber = ({ onMenuChange }) => {
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
    console.log("[menu-events][customer-backend] Raw DB notification:", payload);

    const change = parseMenuChangePayload(payload);

    if (!change) {
      console.warn("[menu-events][customer-backend] Skipping invalid DB notification payload");
      return;
    }

    console.log("[menu-events][customer-backend] Parsed menu change:", change);
    console.log("[menu-events][customer-backend] Resetting menu cache");
    resetMenuCache();
    console.log("[menu-events][customer-backend] Forwarding menu change to WebSocket gateway");
    onMenuChange(change);
  };

  const connect = async () => {
    if (isStopped) {
      return;
    }

    clearReconnectTimer();
    console.log("[menu-events][customer-backend] Connecting DB LISTEN subscriber...");
    warnIfUsingPoolerForRealtime();

    const nextSubscriber = new Client(getRealtimeDatabaseConfig());

    nextSubscriber.on("notification", handleNotification);
    nextSubscriber.on("error", (error) => {
      console.error("Menu change subscriber error:", error);
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
        console.warn("Menu change subscriber disconnected. Reconnecting...");
        scheduleReconnect();
      }
    });

    try {
      await nextSubscriber.connect();
      await nextSubscriber.query(`LISTEN ${MENU_CHANGES_CHANNEL}`);
      subscriber = nextSubscriber;
      console.log(
        `[menu-events][customer-backend] Listening for menu changes on channel "${MENU_CHANGES_CHANNEL}"`
      );
    } catch (error) {
      console.error("Failed to start menu change subscriber:", error);
      try {
        await nextSubscriber.end();
      } catch (closeError) {
        console.error("Failed to close menu change subscriber after startup error:", closeError);
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
          console.error("Failed to stop menu change subscriber:", error);
        } finally {
          subscriber = null;
        }
      }
    },
  };
};

module.exports = {
  startMenuChangeSubscriber,
};
