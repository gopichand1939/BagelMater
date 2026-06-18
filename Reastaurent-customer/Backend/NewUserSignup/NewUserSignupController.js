const NewUserSignupModal = require("./NewUserSignupModal");

const checkEligibility = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    const promoSettings = await NewUserSignupModal.getPromoSettings();

    if (!promoSettings || Number(promoSettings.is_enabled) !== 1) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: "promo_disabled",
          message: "Welcome promotion is currently inactive.",
        },
      });
    }

    const emailExists = await NewUserSignupModal.checkEmailExists(email.trim());
    let isEligible = false;
    let reason = "";
    let message = "";

    if (!emailExists) {
      isEligible = true;
    } else {
      const hasOrders = await NewUserSignupModal.hasOrders(email.trim());
      if (!hasOrders) {
        isEligible = true;
      } else {
        isEligible = false;
        reason = "already_ordered";
        message = "You have already placed orders with this account.";
      }
    }

    if (!isEligible) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: reason || "email_registered",
          message: message || "Email address is already registered.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        eligible: true,
        promo_title: promoSettings.promo_title,
        promo_message: promoSettings.promo_message,
        coupon_code: promoSettings.coupon_code,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check signup eligibility",
    });
  }
};

module.exports = {
  checkEligibility,
};
