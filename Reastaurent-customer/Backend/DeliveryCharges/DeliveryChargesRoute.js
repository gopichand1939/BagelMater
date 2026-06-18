const express = require("express");
const { getDeliveryChargesSettings } = require("./DeliveryChargesController");

const router = express.Router();

router.get("/settings", getDeliveryChargesSettings);

module.exports = router;
