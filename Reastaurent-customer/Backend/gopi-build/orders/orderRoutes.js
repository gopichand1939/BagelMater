const express = require("express");
const {
  placeOrder,
  getMyOrders,
  getMyOrderById,
} = require("./orderController");
const { requireCustomerAuth } = require("../auth/customerAuthMiddleware");

const router = express.Router();

router.post("/place-order", requireCustomerAuth, placeOrder);
router.post("/my-orders", requireCustomerAuth, getMyOrders);
router.post("/order-details", requireCustomerAuth, getMyOrderById);

module.exports = router;
