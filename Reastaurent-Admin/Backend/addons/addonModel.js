const db = require("../config/db");

const addonModel = {
  ensureAddonTable: async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS item_addons (
        id SERIAL PRIMARY KEY,
        item_id INT REFERENCES items(id),
        addon_group VARCHAR(120) NOT NULL,
        min_select INT DEFAULT 0,
        max_select INT DEFAULT 99,
        addon_name VARCHAR(255) NOT NULL,
        addon_price DECIMAL(10, 2) DEFAULT 0.00,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted SMALLINT DEFAULT 0,
        is_active SMALLINT DEFAULT 1
      );
    `);
    await db.query(`ALTER TABLE item_addons ALTER COLUMN item_id DROP NOT NULL;`);
    await db.query(`ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS min_select INT DEFAULT 0;`);
    await db.query(`ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS max_select INT DEFAULT 99;`);
    await db.query(`ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS addon_price DECIMAL(10, 2) DEFAULT 0.00;`);
    await db.query(`ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_item_addons_item_id ON item_addons(item_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_item_addons_group_name ON item_addons(addon_group, addon_name);`);
  },

  ensureAddonAccessMenu: async () => {
    await db.query(`
      WITH menu_module AS (
        SELECT module_id
        FROM access_modules
        WHERE status = 1
        ORDER BY priority ASC, module_id ASC
        LIMIT 1
      ),
      next_priority AS (
        SELECT COALESCE(MAX(priority), 0) + 1 AS priority
        FROM access_menus
        WHERE parent_menu_id IS NULL
      ),
      inserted AS (
        INSERT INTO access_menus (
          parent_menu_id,
          module_id,
          menu_key,
          menu_name,
          route_path,
          icon_key,
          priority,
          status
        )
        SELECT
          NULL,
          mm.module_id,
          'addon',
          'Addon Master',
          '/addon',
          'addon',
          np.priority,
          1
        FROM menu_module mm
        CROSS JOIN next_priority np
        WHERE NOT EXISTS (SELECT 1 FROM access_menus WHERE menu_key = 'addon')
        RETURNING menu_id
      )
      UPDATE access_menus
      SET
        parent_menu_id = NULL,
        menu_name = 'Addon Master',
        route_path = '/addon',
        icon_key = 'addon',
        status = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE menu_key = 'addon'
         OR menu_id IN (SELECT menu_id FROM inserted);
    `);

    await db.query(`
      INSERT INTO access_menu_actions (menu_id, action_id, priority, status)
      SELECT
        am.menu_id,
        aa.action_id,
        CASE aa.action_key
          WHEN 'add' THEN 1
          WHEN 'view' THEN 2
          WHEN 'edit' THEN 3
          WHEN 'delete' THEN 4
        END,
        1
      FROM access_menus am
      JOIN access_actions aa
        ON aa.action_key IN ('add', 'view', 'edit', 'delete')
       AND aa.status = 1
      WHERE am.menu_key = 'addon'
      ON CONFLICT (menu_id, action_id) DO NOTHING;
    `);

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
        AND am.menu_key = 'addon'
      ON CONFLICT (admin_id, menu_id, action_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);
  },

  createAddon: async (addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active) => {
    const query = `
      INSERT INTO item_addons
      (item_id, addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active)
      SELECT NULL, $1::VARCHAR(120), $2::INT, $3::INT, $4::VARCHAR(255), $5::DECIMAL(10,2), $6::INT, $7::SMALLINT
      WHERE NOT EXISTS (
          SELECT 1
          FROM item_addons
          WHERE item_id IS NULL
            AND LOWER(addon_group) = LOWER($1::TEXT)
            AND LOWER(addon_name) = LOWER($4::TEXT)
            AND is_deleted = 0
        )
      RETURNING *;
    `;
    const values = [addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active];
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  syncAddonGroupLimits: async (addon_group, min_select, max_select) => {
    await db.query(
      `
        UPDATE item_addons
        SET
          min_select = $2::INT,
          max_select = $3::INT,
          updated_at = CURRENT_TIMESTAMP
        WHERE item_id IS NULL
          AND LOWER(addon_group) = LOWER($1::TEXT)
          AND is_deleted = 0;
      `,
      [addon_group, min_select, max_select]
    );
  },

  getAddonList: async (limit, offset, addon_group = null) => {
    const query = `
      SELECT
        ia.id,
        ia.item_id,
        i.item_name,
        ia.addon_group,
        ia.min_select,
        ia.max_select,
        ia.addon_name,
        ia.addon_price,
        ia.sort_order,
        ia.created_at,
        ia.updated_at,
        ia.is_deleted,
        ia.is_active,
        COUNT(*) OVER()::INT AS total_records
      FROM item_addons ia
      LEFT JOIN items i ON i.id = ia.item_id
      WHERE ia.is_deleted = 0
        AND ia.item_id IS NULL
        AND ($3::TEXT IS NULL OR LOWER(ia.addon_group) = LOWER($3::TEXT))
      ORDER BY ia.id DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset, addon_group]);
    return result.rows;
  },

  getAddonById: async (id) => {
    const query = `
      SELECT
        ia.id,
        ia.item_id,
        i.item_name,
        ia.addon_group,
        ia.min_select,
        ia.max_select,
        ia.addon_name,
        ia.addon_price,
        ia.sort_order,
        ia.created_at,
        ia.updated_at,
        ia.is_deleted,
        ia.is_active
      FROM item_addons ia
      LEFT JOIN items i ON i.id = ia.item_id
      WHERE ia.id = $1::INT
        AND ia.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  updateAddon: async (id, addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active) => {
    const query = `
      WITH target AS (
        SELECT id
        FROM item_addons
        WHERE id = $1::INT
          AND is_deleted = 0
      ),
      duplicate AS (
        SELECT 1 AS found
        FROM item_addons
        WHERE item_id IS NULL
          AND LOWER(addon_group) = LOWER($2::TEXT)
          AND LOWER(addon_name) = LOWER($5::TEXT)
          AND is_deleted = 0
          AND id != $1::INT
        LIMIT 1
      ),
      updated AS (
        UPDATE item_addons
        SET
          item_id = NULL,
          addon_group = $2::VARCHAR(120),
          min_select = $3::INT,
          max_select = $4::INT,
          addon_name = $5::VARCHAR(255),
          addon_price = $6::DECIMAL(10,2),
          sort_order = $7::INT,
          is_active = $8::SMALLINT,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1::INT
          AND is_deleted = 0
          AND NOT EXISTS (SELECT 1 FROM duplicate)
        RETURNING *
      )
      SELECT
        EXISTS (SELECT 1 FROM target) AS target_exists,
        TRUE AS item_exists,
        EXISTS (SELECT 1 FROM duplicate) AS duplicate_exists,
        updated.id,
        updated.item_id,
        updated.addon_group,
        updated.min_select,
        updated.max_select,
        updated.addon_name,
        updated.addon_price,
        updated.sort_order,
        updated.created_at,
        updated.updated_at,
        updated.is_deleted,
        updated.is_active
      FROM (SELECT 1) AS base
      LEFT JOIN updated ON TRUE;
    `;
    const values = [id, addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  deleteAddon: async (id) => {
    const query = `
      UPDATE item_addons
      SET
        is_deleted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::INT
        AND is_deleted = 0
      RETURNING *;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  getAddonsByItem: async () => {
    const query = `
      SELECT
        ia.id,
        ia.item_id,
        ia.addon_group,
        ia.min_select,
        ia.max_select,
        ia.addon_name,
        ia.addon_price,
        ia.sort_order,
        ia.is_active
      FROM item_addons ia
      WHERE ia.item_id IS NULL
        AND ia.is_deleted = 0
        AND ia.is_active = 1
      ORDER BY ia.addon_group ASC, ia.sort_order ASC, ia.id ASC
    `;
    const result = await db.query(query);
    return result.rows;
  },
};

module.exports = addonModel;
