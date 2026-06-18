const express = require("express");
const { requireAdminAuth } = require("../Login/authMiddleware");
const {
  getDeliveryChargesSettings,
  updateDeliveryChargesSettings,
} = require("./DeliveryChargesController");

const router = express.Router();

router.get("/settings", requireAdminAuth, getDeliveryChargesSettings);
router.put("/settings", requireAdminAuth, updateDeliveryChargesSettings);

module.exports = router;
