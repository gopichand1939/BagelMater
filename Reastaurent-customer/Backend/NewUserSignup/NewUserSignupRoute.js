const express = require("express");
const { checkEligibility } = require("./NewUserSignupController");

const router = express.Router();

router.post("/check-eligibility", checkEligibility);

module.exports = router;
