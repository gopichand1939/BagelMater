const express = require("express");
const {
  getProfile,
  updateProfile,
} = require("./customerProfileController");
const { requireCustomerAuth } = require("../auth/customerAuthMiddleware");

const router = express.Router();

router.get("/profile", requireCustomerAuth, getProfile);
router.post("/update-profile", requireCustomerAuth, updateProfile);

module.exports = router;
