const db = require("../config/db");

const DeliveryChargesModel = {
  ensureDeliveryChargesTable: async () => {
    // 1. Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS delivery_charge_settings (
        id SERIAL PRIMARY KEY,
        base_charge NUMERIC(10,2) NOT NULL DEFAULT 30.00,
        charge_per_km NUMERIC(10,2) NOT NULL DEFAULT 10.00,
        free_delivery_threshold NUMERIC(10,2) NOT NULL DEFAULT 500.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed default row
    await db.query(`
      INSERT INTO delivery_charge_settings (id, base_charge, charge_per_km, free_delivery_threshold)
      VALUES (1, 30.00, 10.00, 500.00)
      ON CONFLICT (id) DO NOTHING;
    `);
  },

  ensureDeliveryChargesAccessMenu: async () => {
    // Upsert Module
    await db.query(`
      INSERT INTO access_modules (module_key, module_name, priority, status)
      VALUES ('delivery_charges', 'Delivery Charges', 14, 1)
      ON CONFLICT (module_key)
      DO UPDATE SET
        module_name = EXCLUDED.module_name,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);

    // Upsert Menu
    await db.query(`
      WITH resolved_module AS (
        SELECT module_id FROM access_modules WHERE module_key = 'delivery_charges' LIMIT 1
      )
      INSERT INTO access_menus (parent_menu_id, module_id, menu_key, menu_name, route_path, icon_key, priority, status)
      SELECT NULL, rm.module_id, 'delivery_charges', 'Delivery Charges', '/delivery-charges', 'payments', 14, 1
      FROM resolved_module rm
      ON CONFLICT (menu_key)
      DO UPDATE SET
        parent_menu_id = EXCLUDED.parent_menu_id,
        module_id = EXCLUDED.module_id,
        menu_name = EXCLUDED.menu_name,
        route_path = EXCLUDED.route_path,
        icon_key = EXCLUDED.icon_key,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);

    // Map Menu Actions
    const ACTION_KEYS = ["add", "view", "edit", "delete"];
    await db.query(`
      WITH resolved_menu AS (
        SELECT menu_id FROM access_menus WHERE menu_key = 'delivery_charges' LIMIT 1
      )
      INSERT INTO access_menu_actions (menu_id, action_id, priority, status)
      SELECT
        rm.menu_id,
        aa.action_id,
        CASE aa.action_key
          WHEN 'add' THEN 1
          WHEN 'view' THEN 2
          WHEN 'edit' THEN 3
          WHEN 'delete' THEN 4
        END,
        1
      FROM resolved_menu rm
      JOIN access_actions aa
        ON aa.action_key = ANY($1::text[])
       AND aa.status = 1
      ON CONFLICT (menu_id, action_id)
      DO UPDATE SET
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `, [ACTION_KEYS]);

    // Assign Permissions to Admin users
    await db.query(`
      INSERT INTO admin_menu_permissions (admin_id, menu_id, action_id, status)
      SELECT
        a.id,
        ama.menu_id,
        ama.action_id,
        1
      FROM admin a
      JOIN access_menu_actions ama ON 1 = 1
      JOIN access_menus am ON am.menu_id = ama.menu_id
      WHERE a.is_deleted = 0
        AND am.menu_key = 'delivery_charges'
      ON CONFLICT (admin_id, menu_id, action_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);
  },

  getSettings: async () => {
    const query = `
      SELECT *
      FROM delivery_charge_settings
      WHERE id = 1
      LIMIT 1;
    `;
    const result = await db.query(query);
    return result.rows[0] || null;
  },

  updateSettings: async ({ base_charge, charge_per_km, free_delivery_threshold }) => {
    const query = `
      INSERT INTO delivery_charge_settings (id, base_charge, charge_per_km, free_delivery_threshold)
      VALUES (1, $1, $2, $3)
      ON CONFLICT (id)
      DO UPDATE SET
        base_charge = EXCLUDED.base_charge,
        charge_per_km = EXCLUDED.charge_per_km,
        free_delivery_threshold = EXCLUDED.free_delivery_threshold,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [base_charge, charge_per_km, free_delivery_threshold];
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }
};

module.exports = DeliveryChargesModel;
