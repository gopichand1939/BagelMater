const OffersModel = require("./OffersModel");

const getOffersSettings = async (req, res) => {
  try {
    const settings = await OffersModel.getSettings();
    return res.status(200).json({
      success: true,
      message: "Offers settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch offers settings",
    });
  }
};

const updateOffersSettings = async (req, res) => {
  try {
    const { is_enabled, promo_title, promo_message, coupon_code } = req.body;

    if (promo_title === undefined || promo_title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Promotion title is required",
      });
    }

    if (coupon_code === undefined || coupon_code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    const updatedSettings = await OffersModel.updateSettings({
      is_enabled: is_enabled ? 1 : 0,
      promo_title: promo_title.trim(),
      promo_message: (promo_message || "").trim(),
      coupon_code: coupon_code.trim().toUpperCase(),
    });

    return res.status(200).json({
      success: true,
      message: "Offers settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update offers settings",
    });
  }
};

module.exports = {
  getOffersSettings,
  updateOffersSettings,
};
