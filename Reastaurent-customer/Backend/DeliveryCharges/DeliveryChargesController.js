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

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const findNearestOutlet = async (req, res) => {
  try {
    const { latitude, longitude, subtotal = 0 } = req.body;

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude coordinates provided.",
      });
    }

    // Fetch official cafe location from settings
    const restaurantLoc = await DeliveryChargesModel.getRestaurantLocation();

    // Default fallbacks if settings are missing or coordinates not configured
    const cafeLat = (restaurantLoc && restaurantLoc.latitude !== null) ? Number(restaurantLoc.latitude) : 17.7318369;
    const cafeLon = (restaurantLoc && restaurantLoc.longitude !== null) ? Number(restaurantLoc.longitude) : 83.2966345;
    const cafeAddress = (restaurantLoc && restaurantLoc.address) ? restaurantLoc.address : "Srinivasa Nagar, Nandagiri Nagar, Thatichetlapalem, Visakhapatnam, Visakhapatnam Urban, Visakhapatnam, Andhra Pradesh, 530001, India";
    const cafeName = (restaurantLoc && restaurantLoc.restaurant_name) ? restaurantLoc.restaurant_name : "Bagel Master Cafe";

    const settings = await DeliveryChargesModel.getSettings() || {
      base_charge: 5,
      charge_per_km: 1.5,
      free_delivery_threshold: 50,
    };

    const baseCharge = Number(settings.base_charge);
    const chargePerKm = Number(settings.charge_per_km);
    const freeDeliveryThreshold = Number(settings.free_delivery_threshold);

    // Calculate distance to customer
    const distance = calculateHaversineDistance(cafeLat, cafeLon, lat, lon);

    // Delivery is always accepted for this cafe address
    const computedFee = baseCharge + (distance * chargePerKm);
    const isFreeDelivery = subtotal > 0 && subtotal >= freeDeliveryThreshold;
    const deliveryFee = isFreeDelivery ? 0 : Number(computedFee.toFixed(2));
    const message = `Delivery is available from ${cafeName} (${distance.toFixed(1)} km away).`;

    return res.status(200).json({
      success: true,
      data: {
        nearest_outlet: {
          id: 1,
          name: cafeName,
          address: cafeAddress,
          distance_km: distance,
          max_delivery_radius_km: 99999.0, // Large boundary to ensure range is always accepted
        },
        delivery_available: true,
        delivery_fee: deliveryFee,
        free_delivery_threshold: freeDeliveryThreshold,
        message,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to determine nearest outlet",
    });
  }
};

module.exports = {
  getDeliveryChargesSettings,
  findNearestOutlet,
};
