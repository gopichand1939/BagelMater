const db = require("../config/db");

const OffersModel = {
  ensureOffersTable: async () => {
    // 1. Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS signup_promo_settings (
        id SERIAL PRIMARY KEY,
        is_enabled SMALLINT NOT NULL DEFAULT 1,
        promo_title VARCHAR(255) NOT NULL DEFAULT 'Free Delivery on 1st Order',
        promo_message TEXT NOT NULL DEFAULT 'Welcome! Enjoy free delivery on your first order with us. Use code FREE1ST at checkout.',
        coupon_code VARCHAR(50) NOT NULL DEFAULT 'FREE1ST',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed default row
    await db.query(`
      INSERT INTO signup_promo_settings (id, is_enabled, promo_title, promo_message, coupon_code)
      VALUES (1, 1, 'Free Delivery on 1st Order', 'Welcome! Enjoy free delivery on your first order with us. Use code FREE1ST at checkout.', 'FREE1ST')
      ON CONFLICT (id) DO NOTHING;
    `);
  },

  ensureOffersAccessMenu: async () => {
    // Upsert Module
    await db.query(`
      INSERT INTO access_modules (module_key, module_name, priority, status)
      VALUES ('offers', 'Offers', 12, 1)
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
        SELECT module_id FROM access_modules WHERE module_key = 'offers' LIMIT 1
      )
      INSERT INTO access_menus (parent_menu_id, module_id, menu_key, menu_name, route_path, icon_key, priority, status)
      SELECT NULL, rm.module_id, 'offers', 'Offers', '/offers', 'offers', 12, 1
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
        SELECT menu_id FROM access_menus WHERE menu_key = 'offers' LIMIT 1
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
        AND am.menu_key = 'offers'
      ON CONFLICT (admin_id, menu_id, action_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);
  },

  getSettings: async () => {
    const query = `
      SELECT *
      FROM signup_promo_settings
      WHERE id = 1
      LIMIT 1;
    `;
    const result = await db.query(query);
    return result.rows[0] || null;
  },

  updateSettings: async ({ is_enabled, promo_title, promo_message, coupon_code }) => {
    const query = `
      INSERT INTO signup_promo_settings (id, is_enabled, promo_title, promo_message, coupon_code)
      VALUES (1, $1, $2, $3, $4)
      ON CONFLICT (id)
      DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        promo_title = EXCLUDED.promo_title,
        promo_message = EXCLUDED.promo_message,
        coupon_code = EXCLUDED.coupon_code,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [is_enabled, promo_title, promo_message, coupon_code];
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }
};

module.exports = OffersModel;
