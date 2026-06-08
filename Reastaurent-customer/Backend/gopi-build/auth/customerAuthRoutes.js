const express = require("express");
const {
  registerCustomer,
  loginCustomer,
  refreshCustomerToken,
  logoutCustomer,
  changePassword,
} = require("./customerAuthController");
const { requireCustomerAuth } = require("./customerAuthMiddleware");

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/refresh-token", refreshCustomerToken);
router.post("/logout", requireCustomerAuth, logoutCustomer);
router.post("/change-password", requireCustomerAuth, changePassword);

module.exports = router;
