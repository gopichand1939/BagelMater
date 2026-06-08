const http = require("http");
const express = require("express");
const cors = require("cors");

require("dotenv").config();

const db = require("./config/db");
const menuRoutes = require("./menu/menuRoutes");
const customerAuthRoutes = require("./auth/customerAuthRoutes");
const customerProfileRoutes = require("./customer/customerProfileRoutes");
const customerOrderRoutes = require("./orders/orderRoutes");
const customerNotificationRoutes = require("./notifications/notificationRoutes");
const paymentRoutes = require("./payments/paymentRoutes");
const {
  createMenuUpdatesGateway,
} = require("./realtime/menuUpdatesGateway");
const {
  startMenuChangeSubscriber,
} = require("./realtime/menuChangeSubscriber");
const {
  startOrderChangeSubscriber,
} = require("./realtime/orderChangeSubscriber");
const {
  startNotificationChangeSubscriber,
} = require("./realtime/notificationChangeSubscriber");
const {
  createNotificationFromOrderChangeSafely,
} = require("./notifications/notificationService");

const app = express();
const server = http.createServer(app);
const menuUpdatesGateway = createMenuUpdatesGateway(server);

app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      if (req.originalUrl === "/api/payments/webhook") {
        req.rawBody = buffer;
      }
    },
  })
);
app.use("/images", express.static("public"));

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startedAt;

    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
});

app.use("/api", menuRoutes);
app.use("/api/auth", customerAuthRoutes);
app.use("/api/customer", customerProfileRoutes);
app.use("/api/orders", customerOrderRoutes);
app.use("/api/notifications", customerNotificationRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/health", async (_req, res) => {
  try {
    const startedAt = Date.now();
    await db.query("SELECT 1");

    res.json({
      status: "ok",
      dbLatency: `${Date.now() - startedAt}ms`,
      websocketClients: menuUpdatesGateway.getClientCount(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: error.message,
    });
  }
});

const PORT = Number(process.env.PORT) || 15014;

const startServer = async () => {
  try {
    console.log("Warming up database connection...");
    await db.warmUp();

    startMenuChangeSubscriber({
      onMenuChange: (change) => {
        menuUpdatesGateway.broadcastMenuUpdate(change);
      },
    });
    startOrderChangeSubscriber({
      onOrderChange: (change) => {
        menuUpdatesGateway.broadcastOrderUpdate(change);
        void createNotificationFromOrderChangeSafely(change);
      },
    });
    startNotificationChangeSubscriber({
      onNotificationChange: (change) => {
        menuUpdatesGateway.broadcastNotificationUpdate(change);
      },
    });

    server.listen(PORT, () => {
      console.log(`Customer backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start customer backend:", error);
    process.exit(1);
  }
};

startServer();
