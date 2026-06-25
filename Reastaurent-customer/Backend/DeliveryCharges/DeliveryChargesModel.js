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
  },

  ensureOutletsTable: async () => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS outlets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        max_delivery_radius_km DOUBLE PRECISION NOT NULL DEFAULT 10.0,
        is_active SMALLINT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(createTableQuery);

    // Check if empty, then seed default outlets (London & Bangalore)
    const checkQuery = `SELECT COUNT(*) FROM outlets;`;
    const countRes = await db.query(checkQuery);
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      const seedQuery = `
        INSERT INTO outlets (name, address, latitude, longitude, max_delivery_radius_km, is_active)
        VALUES
          ('London Covent Garden Outlet', 'Bagel Master, Covent Garden, London', 51.5113, -0.1223, 10.0, 1),
          ('London Soho Outlet', 'Bagel Master, Soho, London', 51.5136, -0.1365, 8.0, 1),
          ('London Shoreditch Outlet', 'Bagel Master, Shoreditch, London', 51.5242, -0.0762, 8.0, 1),
          ('Bangalore MG Road Outlet', 'Bagel Master Cafe, MG Road, Bengaluru', 12.9716, 77.5946, 12.0, 1),
          ('Bangalore Indiranagar Outlet', 'Bagel Master Cafe, Indiranagar, Bengaluru', 12.9783, 77.6408, 10.0, 1)
      `;
      await db.query(seedQuery);
      console.log("🌱 Default outlets seeded in database.");
    }
  },

  findNearestOutlet: async (lat, lon) => {
    // Ensure table exists and has data
    await DeliveryChargesModel.ensureOutletsTable();

    // Query to find the nearest outlet using Haversine formula
    const query = `
      SELECT id, name, address, latitude, longitude, max_delivery_radius_km, is_active,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM outlets
      WHERE is_active = 1
      ORDER BY distance_km ASC
      LIMIT 1;
    `;
    const result = await db.query(query, [lat, lon]);
    return result.rows[0] || null;
  },

  getRestaurantLocation: async () => {
    const query = `
      SELECT restaurant_name, address, latitude, longitude
      FROM restaurant_settings
      LIMIT 1;
    `;
    const result = await db.query(query);
    return result.rows[0] || null;
  }
};

module.exports = DeliveryChargesModel;
