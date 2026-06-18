const db = require("../config/db");

const DeliveryChargesModel = {
  getSettings: async () => {
    const query = `
      SELECT base_charge, charge_per_km, free_delivery_threshold
      FROM delivery_charge_settings
      WHERE id = 1
      LIMIT 1;
    `;
    const result = await db.query(query);
    return result.rows[0] || null;
  }
};

module.exports = DeliveryChargesModel;
