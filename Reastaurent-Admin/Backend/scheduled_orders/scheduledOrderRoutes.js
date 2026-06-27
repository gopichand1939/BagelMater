const express = require("express");
const {
  createScheduledOrder,
  getScheduledOrderList,
  getScheduledOrderById,
  updateScheduledOrder,
  checkAndTransitionDueOrders,
} = require("./scheduledOrderController");

const router = express.Router();

router.post("/create_order", createScheduledOrder);
router.post("/order_list", getScheduledOrderList);
router.post("/get_order_byId", getScheduledOrderById);
router.post("/update_order", updateScheduledOrder);
router.post("/check_and_transition", checkAndTransitionDueOrders);

module.exports = router;
