const DeliveryChargesModel = require("./DeliveryChargesModel");

const getDeliveryChargesSettings = async (req, res) => {
  try {
    const settings = await DeliveryChargesModel.getSettings();
    return res.status(200).json({
      success: true,
      message: "Delivery charges settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch delivery charges settings",
    });
  }
};

const updateDeliveryChargesSettings = async (req, res) => {
  try {
    const { base_charge, charge_per_km, free_delivery_threshold } = req.body;

    if (base_charge === undefined || isNaN(base_charge) || Number(base_charge) < 0) {
      return res.status(400).json({
        success: false,
        message: "A valid base charge is required",
      });
    }

    if (charge_per_km === undefined || isNaN(charge_per_km) || Number(charge_per_km) < 0) {
      return res.status(400).json({
        success: false,
        message: "A valid charge per km is required",
      });
    }

    if (
      free_delivery_threshold === undefined ||
      isNaN(free_delivery_threshold) ||
      Number(free_delivery_threshold) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid free delivery threshold is required",
      });
    }

    const updatedSettings = await DeliveryChargesModel.updateSettings({
      base_charge: Number(base_charge),
      charge_per_km: Number(charge_per_km),
      free_delivery_threshold: Number(free_delivery_threshold),
    });

    return res.status(200).json({
      success: true,
      message: "Delivery charges settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update delivery charges settings",
    });
  }
};

module.exports = {
  getDeliveryChargesSettings,
  updateDeliveryChargesSettings,
};
