const express = require("express");
const { requireAdminAuth } = require("../Login/authMiddleware");
const {
  getOffersSettings,
  updateOffersSettings,
} = require("./OffersController");

const router = express.Router();

router.get("/settings", requireAdminAuth, getOffersSettings);
router.put("/settings", requireAdminAuth, updateOffersSettings);

module.exports = router;
