const db = require("../config/db");

const TopProductsModel = {
  ensureTopProductsTable: async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS top_products (
        id SERIAL PRIMARY KEY,
        item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        sort_order INT NOT NULL DEFAULT 1,
        is_active SMALLINT NOT NULL DEFAULT 1,
        is_deleted SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_top_products_item_id
      ON top_products (item_id)
      WHERE is_deleted = 0;
    `);
  },

  ensureTopProductsAccessMenu: async () => {
    const menu = { key: "top_products", name: "Top Products", path: "/top-products" };

    await db.query(
      `
        WITH menu_module AS (
          SELECT module_id
          FROM access_modules
          WHERE status = 1
          ORDER BY priority ASC, module_id ASC
          LIMIT 1
        ),
        menu_parent AS (
          SELECT menu_id
          FROM access_menus
          WHERE menu_key = 'menu_management'
          LIMIT 1
        ),
        base_priority AS (
          SELECT COALESCE(MAX(priority), 0) + 5 AS priority
          FROM access_menus
          WHERE parent_menu_id = (SELECT menu_id FROM menu_parent)
        )
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
          (SELECT menu_id FROM menu_parent),
          mm.module_id,
          $1::VARCHAR(100),
          $2::VARCHAR(255),
          $3::VARCHAR(255),
          'items',
          bp.priority,
          1
        FROM menu_module mm
        CROSS JOIN base_priority bp
        WHERE NOT EXISTS (SELECT 1 FROM access_menus WHERE menu_key = $1::VARCHAR(100));
      `,
      [menu.key, menu.name, menu.path]
    );

    await db.query(
      `
        WITH menu_parent AS (
          SELECT menu_id
          FROM access_menus
          WHERE menu_key = 'menu_management'
          LIMIT 1
        )
        UPDATE access_menus
        SET
          parent_menu_id = (SELECT menu_id FROM menu_parent),
          menu_name = $2::VARCHAR(255),
          route_path = $3::VARCHAR(255),
          icon_key = 'items',
          status = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE menu_key = $1::VARCHAR(100);
      `,
      [menu.key, menu.name, menu.path]
    );

    const ACTION_KEYS = ["add", "view", "edit", "delete"];
    await db.query(
      `
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
          ON aa.action_key = ANY($1::text[])
         AND aa.status = 1
        WHERE am.menu_key = 'top_products'
        ON CONFLICT (menu_id, action_id) DO NOTHING;
      `,
      [ACTION_KEYS]
    );

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
        AND am.menu_key = 'top_products'
      ON CONFLICT (admin_id, menu_id, action_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);
  },

  getTopProductList: async () => {
    const query = `
      SELECT
        tp.id,
        tp.item_id,
        tp.sort_order,
        tp.is_active,
        tp.created_at,
        tp.updated_at,
        i.item_name,
        i.item_description,
        i.item_image,
        i.price,
        i.discount_price,
        i.is_veg,
        c.category_name
      FROM top_products tp
      INNER JOIN items i ON i.id = tp.item_id
      LEFT JOIN category c ON c.id = i.category_id
      WHERE tp.is_deleted = 0
      ORDER BY tp.sort_order ASC, tp.id ASC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  addTopProducts: async (itemIds) => {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      for (const itemId of itemIds) {
        const maxSortOrderResult = await client.query(
          `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM top_products WHERE is_deleted = 0`
        );
        const nextOrder = (maxSortOrderResult.rows[0]?.max_order || 0) + 1;

        await client.query(
          `
            INSERT INTO top_products (item_id, sort_order)
            SELECT $1, $2
            WHERE NOT EXISTS (
              SELECT 1 FROM top_products
              WHERE item_id = $1 AND is_deleted = 0
            )
          `,
          [itemId, nextOrder]
        );
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  updateTopProduct: async (id, is_active) => {
    const query = `
      UPDATE top_products
      SET is_active = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = 0
      RETURNING *;
    `;
    const result = await db.query(query, [id, is_active]);
    return result.rows[0];
  },

  deleteTopProduct: async (id) => {
    const query = `
      UPDATE top_products
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = 0
      RETURNING *;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  reorderTopProducts: async (orderedIds) => {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const query = `
        UPDATE top_products
        SET
          sort_order = CASE id
            ${orderedIds.map((id, index) => `WHEN $${index + 1}::INT THEN $${orderedIds.length + index + 1}::INT`).join(" ")}
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${orderedIds.map((_, i) => `$${i + 1}::INT`).join(", ")})
          AND is_deleted = 0;
      `;
      const values = [...orderedIds, ...orderedIds.map((_, index) => index + 1)];
      await client.query(query, values);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  searchItemsForTopProducts: async (categoryId, searchQuery) => {
    let query = `
      SELECT
        i.id,
        i.category_id,
        c.category_name,
        i.item_name,
        i.item_description,
        i.item_image,
        i.price,
        i.discount_price,
        i.is_active,
        i.is_veg,
        EXISTS (
          SELECT 1
          FROM top_products tp
          WHERE tp.item_id = i.id
            AND tp.is_deleted = 0
        ) AS is_top_product
      FROM items i
      LEFT JOIN category c ON c.id = i.category_id
      WHERE i.is_deleted = 0
        AND i.is_active = 1
    `;
    const values = [];

    if (categoryId && categoryId !== "all" && categoryId !== "0") {
      values.push(parseInt(categoryId, 10));
      query += ` AND i.category_id = $${values.length}`;
    }

    if (searchQuery && searchQuery.trim() !== "") {
      values.push(`%${searchQuery.trim()}%`);
      query += ` AND (i.item_name ILIKE $${values.length} OR i.item_description ILIKE $${values.length} OR c.category_name ILIKE $${values.length})`;
    }

    query += ` ORDER BY c.category_name ASC, i.item_name ASC`;
    const result = await db.query(query, values);
    return result.rows;
  }
};

module.exports = TopProductsModel;
