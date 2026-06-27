const express = require("express");
const { createScheduledOrder } = require("./scheduledOrderController");
const { requireCustomerAuth } = require("../auth/customerAuthMiddleware");

const router = express.Router();

router.post("/place-order", requireCustomerAuth, createScheduledOrder);

module.exports = router;
