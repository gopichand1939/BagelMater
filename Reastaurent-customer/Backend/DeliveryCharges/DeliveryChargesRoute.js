const express = require("express");
const { getDeliveryChargesSettings, findNearestOutlet } = require("./DeliveryChargesController");

const router = express.Router();

router.get("/settings", getDeliveryChargesSettings);
router.post("/nearest", findNearestOutlet);

module.exports = router;
