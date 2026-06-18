require("dotenv").config();

const http = require("http");
const express = require("express");
const path = require("path");
const categoryRoutes = require("./category/categoryRoutes");
const itemRoutes = require("./items/itemRoutes");
const addonRoutes = require("./addons/addonRoutes");
const addonModel = require("./addons/addonModel");
const adminRoutes = require("./Login/adminRoutes");
const adminModel = require("./Login/adminModel");
const menuAccessModel = require("./Access/menuAccessModel");
const restaurantSettingsRoutes = require("./restaurant/restaurantSettingsRoutes");
const restaurantSettingsModel = require("./restaurant/restaurantSettingsModel");
const customerRoutes = require("./customer/customerRoutes");
const orderRoutes = require("./orders/orderRoutes");
const paymentRoutes = require("./payments/paymentRoutes");
const notificationRoutes = require("./notifications/notificationRoutes");
const messageRoutes = require("./messages/messageRoutes");
const dashboardRoutes = require("./Dashboard/DashboardRoutes");
const orderReportsRoutes = require("./Order_Reports/orderReportsRoutes");
const orderReportsModel = require("./Order_Reports/orderReportsModel");
const topProductRoutes = require("./TopProducts/TopProductRoutes");
const offersRoutes = require("./Offers/OffersRoutes");
const OffersModel = require("./Offers/OffersModel");
const deliveryChargesRoutes = require("./DeliveryCharges/DeliveryChargesRoutes");
const DeliveryChargesModel = require("./DeliveryCharges/DeliveryChargesModel");
const { startOrderChangeSubscriber } = require("./realtime/orderChangeSubscriber");
const { startPaymentChangeSubscriber } = require("./realtime/paymentChangeSubscriber");
const { startCustomerChangeSubscriber } = require("./realtime/customerChangeSubscriber");
const { startNotificationChangeSubscriber } = require("./realtime/notificationChangeSubscriber");
const { createAdminUpdatesGateway } = require("./realtime/adminUpdatesGateway");
const db = require("./config/db");

const app = express();
const server = http.createServer(app);
const imageCacheMaxAge = Number(process.env.IMAGE_CACHE_MAX_AGE || 604800);

app.set("trust proxy", true);

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, DeviceID"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
};

app.use((req, res, next) => {
  applyCorsHeaders(req, res);
  next();
});

app.options("*", (req, res) => {
  applyCorsHeaders(req, res);
  return res.sendStatus(204);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/images",
  express.static(path.join(__dirname, "images"), {
    maxAge: imageCacheMaxAge * 1000,
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", `public, max-age=${imageCacheMaxAge}, immutable`);
    },
  })
);

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Restaurant backend is running",
  });
});

app.use("/category", categoryRoutes);
app.use("/items", itemRoutes);
app.use("/addons", addonRoutes);
app.use("/admin", adminRoutes);
app.use("/restaurant", restaurantSettingsRoutes);
app.use("/customer", customerRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/messages", messageRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api/order-reports", orderReportsRoutes);
app.use("/order-reports", orderReportsRoutes);
app.use("/top-products", topProductRoutes);
app.use("/offers", offersRoutes);
app.use("/delivery-charges", deliveryChargesRoutes);

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    console.log("Warming up database connection...");
    await db.warmUp();
    await adminModel.ensureAdminTable();
    await addonModel.ensureAddonTable();
    await menuAccessModel.ensureAccessControlData();
    await addonModel.ensureAddonAccessMenu();
    await restaurantSettingsModel.ensureRestaurantSettingsTable();
    await orderReportsModel.ensureOrderReportsAccessControlData();
    const topProductsModel = require("./TopProducts/TopProductsModal");
    await topProductsModel.ensureTopProductsTable();
    await topProductsModel.ensureTopProductsAccessMenu();
    await OffersModel.ensureOffersTable();
    await OffersModel.ensureOffersAccessMenu();
    await DeliveryChargesModel.ensureDeliveryChargesTable();
    await DeliveryChargesModel.ensureDeliveryChargesAccessMenu();
    const adminUpdatesGateway = createAdminUpdatesGateway(server);

    startOrderChangeSubscriber({
      onOrderChange: (change) => {
        adminUpdatesGateway.broadcastOrderUpdate(change);
      },
    });
    startPaymentChangeSubscriber({
      onPaymentChange: (change) => {
        adminUpdatesGateway.broadcastPaymentUpdate(change);
      },
    });
    startCustomerChangeSubscriber({
      onCustomerChange: (change) => {
        adminUpdatesGateway.broadcastCustomerUpdate(change);
      },
    });
    startNotificationChangeSubscriber({
      onNotificationChange: (change) => {
        adminUpdatesGateway.broadcastNotificationUpdate(change);
      },
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
