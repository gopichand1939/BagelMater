const DeliveryChargesModel = require("./DeliveryChargesModel");

const getDeliveryChargesSettings = async (req, res) => {
  try {
    const settings = await DeliveryChargesModel.getSettings();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Delivery charges settings not found. Please configure them in the Admin Panel.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        base_charge: Number(settings.base_charge),
        charge_per_km: Number(settings.charge_per_km),
        free_delivery_threshold: Number(settings.free_delivery_threshold),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch delivery charges settings",
    });
  }
};

module.exports = {
  getDeliveryChargesSettings,
};
