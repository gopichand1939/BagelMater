const db = require("../config/db");

const ACTION_KEYS = ["add", "view", "edit", "delete"];

const addonModel = {
  ensureAddonTable: async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS addon_group_master (
        id SERIAL PRIMARY KEY,
        group_name VARCHAR(120) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted SMALLINT NOT NULL DEFAULT 0,
        is_active SMALLINT NOT NULL DEFAULT 1
      );
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_addon_group_master_name
      ON addon_group_master (LOWER(group_name))
      WHERE is_deleted = 0;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS addon_item_master (
        id SERIAL PRIMARY KEY,
        group_id INT NOT NULL REFERENCES addon_group_master(id),
        addon_item_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted SMALLINT NOT NULL DEFAULT 0,
        is_active SMALLINT NOT NULL DEFAULT 1
      );
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_addon_item_master_group_name
      ON addon_item_master (group_id, LOWER(addon_item_name))
      WHERE is_deleted = 0;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS addons_eligible_for_items (
        id SERIAL PRIMARY KEY,
        item_id INT NOT NULL REFERENCES items(id),
        group_id INT NOT NULL REFERENCES addon_group_master(id),
        is_required SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted SMALLINT NOT NULL DEFAULT 0,
        is_active SMALLINT NOT NULL DEFAULT 1
      );
    `);

    await db.query(`
      ALTER TABLE IF EXISTS addons_eligible_for_items
        DROP COLUMN IF EXISTS min_selection,
        DROP COLUMN IF EXISTS max_selection;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS addons_eligible_item_options (
        id SERIAL PRIMARY KEY,
        eligibility_id INT NOT NULL REFERENCES addons_eligible_for_items(id) ON DELETE CASCADE,
        addon_item_id INT NOT NULL REFERENCES addon_item_master(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (eligibility_id, addon_item_id)
      );
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_addons_eligible_item_group
      ON addons_eligible_for_items (item_id, group_id)
      WHERE is_deleted = 0;
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_addon_item_master_group ON addon_item_master(group_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_addons_eligible_item ON addons_eligible_for_items(item_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_addons_eligible_options_eligibility ON addons_eligible_item_options(eligibility_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_addons_eligible_options_item ON addons_eligible_item_options(addon_item_id);`);
    await db.query(`
      INSERT INTO addons_eligible_item_options (eligibility_id, addon_item_id)
      SELECT aefi.id, aim.id
      FROM addons_eligible_for_items aefi
      INNER JOIN addon_item_master aim
        ON aim.group_id = aefi.group_id
       AND aim.is_deleted = 0
      WHERE aefi.is_deleted = 0
        AND NOT EXISTS (
          SELECT 1
          FROM addons_eligible_item_options aeio
          WHERE aeio.eligibility_id = aefi.id
        )
      ON CONFLICT DO NOTHING;
    `);
    await db.query(`
      ALTER TABLE addons_eligible_for_items
      ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
    `);
    await db.query(`
      ALTER TABLE addons_eligible_item_options
      ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
    `);
    await addonModel.migrateLegacyAddons();
  },

  migrateLegacyAddons: async () => {
    const exists = await db.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'item_addons'
      ) AS exists;
    `);

    if (!exists.rows[0]?.exists) {
      return;
    }

    await db.query(`
      INSERT INTO addon_group_master (group_name, description, is_active)
      SELECT DISTINCT
        TRIM(addon_group),
        NULL,
        MAX(COALESCE(is_active, 1))::SMALLINT
      FROM item_addons
      WHERE is_deleted = 0
        AND item_id IS NULL
        AND NULLIF(TRIM(addon_group), '') IS NOT NULL
      GROUP BY TRIM(addon_group)
      ON CONFLICT DO NOTHING;
    `);

    await db.query(`
      INSERT INTO addon_item_master (group_id, addon_item_name, price, description, is_active)
      SELECT
        ag.id,
        TRIM(ia.addon_name),
        COALESCE(ia.addon_price, 0),
        NULL,
        COALESCE(ia.is_active, 1)
      FROM item_addons ia
      INNER JOIN addon_group_master ag
        ON LOWER(ag.group_name) = LOWER(TRIM(ia.addon_group))
       AND ag.is_deleted = 0
      WHERE ia.is_deleted = 0
        AND ia.item_id IS NULL
        AND NULLIF(TRIM(ia.addon_name), '') IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
  },

  ensureAddonAccessMenu: async () => {
    const menus = [
      { key: "addon", name: "Addon Group Master", path: "/addon", priority: 0 },
      { key: "addon_item_master", name: "Addon Item Master", path: "/addon-items", priority: 1 },
      { key: "addons_eligible_for_items", name: "Addons Eligible For Items", path: "/addon-eligibility", priority: 2 },
    ];

    for (const menu of menus) {
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
            SELECT COALESCE(MAX(priority), 0) + $4::INT AS priority
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
            'addon',
            bp.priority,
            1
          FROM menu_module mm
          CROSS JOIN base_priority bp
          WHERE NOT EXISTS (SELECT 1 FROM access_menus WHERE menu_key = $1::VARCHAR(100));
        `,
        [menu.key, menu.name, menu.path, menu.priority]
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
            icon_key = 'addon',
            status = 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE menu_key = $1::VARCHAR(100);
        `,
        [menu.key, menu.name, menu.path]
      );
    }

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
        WHERE am.menu_key IN ('addon', 'addon_item_master', 'addons_eligible_for_items')
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
        AND am.menu_key IN ('addon', 'addon_item_master', 'addons_eligible_for_items')
      ON CONFLICT (admin_id, menu_id, action_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `);
  },

  createGroup: async (group_name, description, is_active) => {
    const result = await db.query(
      `
        INSERT INTO addon_group_master (group_name, description, is_active)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING *;
      `,
      [group_name, description, is_active]
    );
    return result.rows[0] || null;
  },

  getGroupList: async (limit, offset) => {
    const result = await db.query(
      `
        SELECT *, COUNT(*) OVER()::INT AS total_records
        FROM addon_group_master
        WHERE is_deleted = 0
        ORDER BY id DESC
        LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );
    return result.rows;
  },

  getActiveGroups: async () => {
    const result = await db.query(
      `
        SELECT id, group_name, description, is_active
        FROM addon_group_master
        WHERE is_deleted = 0
          AND is_active = 1
        ORDER BY group_name ASC;
      `
    );
    return result.rows;
  },

  getGroupById: async (id) => {
    const result = await db.query(
      `
        SELECT *
        FROM addon_group_master
        WHERE id = $1
          AND is_deleted = 0;
      `,
      [id]
    );
    return result.rows[0] || null;
  },

  updateGroup: async (id, group_name, description, is_active) => {
    const result = await db.query(
      `
        WITH duplicate AS (
          SELECT 1
          FROM addon_group_master
          WHERE LOWER(group_name) = LOWER($2)
            AND id != $1
            AND is_deleted = 0
          LIMIT 1
        )
        UPDATE addon_group_master
        SET
          group_name = $2,
          description = $3,
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = 0
          AND NOT EXISTS (SELECT 1 FROM duplicate)
        RETURNING *, EXISTS (SELECT 1 FROM duplicate) AS duplicate_exists;
      `,
      [id, group_name, description, is_active]
    );
    return result.rows[0] || null;
  },

  deleteGroup: async (id) => {
    const result = await db.query(
      `
        UPDATE addon_group_master
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = 0
        RETURNING *;
      `,
      [id]
    );
    return result.rows[0] || null;
  },

  createItem: async (group_id, addon_item_name, price, description, is_active) => {
    const result = await db.query(
      `
        INSERT INTO addon_item_master (group_id, addon_item_name, price, description, is_active)
        SELECT $1, $2, $3, $4, $5
        WHERE EXISTS (
          SELECT 1 FROM addon_group_master WHERE id = $1 AND is_deleted = 0
        )
        ON CONFLICT DO NOTHING
        RETURNING *;
      `,
      [group_id, addon_item_name, price, description, is_active]
    );
    return result.rows[0] || null;
  },

  getItemList: async (limit, offset) => {
    const result = await db.query(
      `
        SELECT
          aim.*,
          ag.group_name,
          COUNT(*) OVER()::INT AS total_records
        FROM addon_item_master aim
        INNER JOIN addon_group_master ag ON ag.id = aim.group_id
        WHERE aim.is_deleted = 0
        ORDER BY aim.id DESC
        LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );
    return result.rows;
  },

  getItemById: async (id) => {
    const result = await db.query(
      `
        SELECT aim.*, ag.group_name
        FROM addon_item_master aim
        INNER JOIN addon_group_master ag ON ag.id = aim.group_id
        WHERE aim.id = $1
          AND aim.is_deleted = 0;
      `,
      [id]
    );
    return result.rows[0] || null;
  },

  updateItem: async (id, group_id, addon_item_name, price, description, is_active) => {
    const result = await db.query(
      `
        WITH duplicate AS (
          SELECT 1
          FROM addon_item_master
          WHERE group_id = $2
            AND LOWER(addon_item_name) = LOWER($3)
            AND id != $1
            AND is_deleted = 0
          LIMIT 1
        )
        UPDATE addon_item_master
        SET
          group_id = $2,
          addon_item_name = $3,
          price = $4,
          description = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = 0
          AND EXISTS (SELECT 1 FROM addon_group_master WHERE id = $2 AND is_deleted = 0)
          AND NOT EXISTS (SELECT 1 FROM duplicate)
        RETURNING *, EXISTS (SELECT 1 FROM duplicate) AS duplicate_exists;
      `,
      [id, group_id, addon_item_name, price, description, is_active]
    );
    return result.rows[0] || null;
  },

  deleteItem: async (id) => {
    const result = await db.query(
      `
        UPDATE addon_item_master
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = 0
        RETURNING *;
      `,
      [id]
    );
    return result.rows[0] || null;
  },

  getActiveItemsByGroup: async (groupId) => {
    const result = await db.query(
      `
        SELECT id, group_id, addon_item_name, price, description
        FROM addon_item_master
        WHERE group_id = $1
          AND is_deleted = 0
          AND is_active = 1
        ORDER BY addon_item_name ASC;
      `,
      [groupId]
    );
    return result.rows;
  },

  validateAddonItemsForGroup: async (groupId, addonItemIds) => {
    if (!addonItemIds.length) {
      return [];
    }

    const result = await db.query(
      `
        SELECT id
        FROM addon_item_master
        WHERE group_id = $1
          AND id = ANY($2::INT[])
          AND is_deleted = 0
          AND is_active = 1;
      `,
      [groupId, addonItemIds]
    );
    return result.rows.map((row) => Number(row.id));
  },

  getActiveMenuItems: async () => {
    const result = await db.query(
      `
        SELECT
          items.id AS item_id,
          items.item_name,
          items.category_id,
          category.category_name
        FROM items
        INNER JOIN category ON category.id = items.category_id
        WHERE items.is_deleted = 0
          AND items.is_active = 1
          AND category.is_deleted = 0
          AND category.is_active = 1
        ORDER BY category.category_name ASC, items.item_name ASC;
      `
    );
    return result.rows;
  },

  getActiveCategories: async () => {
    const result = await db.query(
      `
        SELECT id, category_name
        FROM category
        WHERE is_deleted = 0
          AND is_active = 1
        ORDER BY category_name ASC;
      `
    );
    return result.rows;
  },

  createEligibility: async (item_id, group_id, is_required, is_active, addon_item_ids = []) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query(
        `
          INSERT INTO addons_eligible_for_items
          (item_id, group_id, is_required, is_active, is_deleted)
          SELECT $1, $2, $3, $4, 0
          WHERE EXISTS (SELECT 1 FROM items WHERE id = $1 AND is_deleted = 0)
            AND EXISTS (SELECT 1 FROM addon_group_master WHERE id = $2 AND is_deleted = 0)
          ON CONFLICT (item_id, group_id) WHERE (is_deleted = 0) DO UPDATE SET
            is_deleted = 0,
            is_active = EXCLUDED.is_active,
            is_required = EXCLUDED.is_required,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *;
        `,
        [item_id, group_id, is_required, is_active]
      );
      const row = result.rows[0] || null;

      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `
          INSERT INTO addons_eligible_item_options (eligibility_id, addon_item_id)
          SELECT $1, aim.id
          FROM addon_item_master aim
          WHERE aim.group_id = $2
            AND aim.id = ANY($3::INT[])
            AND aim.is_deleted = 0
            AND aim.is_active = 1
          ON CONFLICT DO NOTHING;
        `,
        [row.id, group_id, addon_item_ids]
      );

      await client.query("COMMIT");
      return row;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  bulkAssignEligibility: async (item_ids, group_id, is_required, is_active, addon_item_ids = []) => {
    const client = await db.pool.connect();
    const summary = { created: 0, updated: 0, skipped: 0 };

    try {
      await client.query("BEGIN");

      const uniqueItemIds = Array.from(new Set(item_ids.map((id) => Number(id)).filter((id) => id > 0)));

      const updated = await client.query(
        `
          WITH target_items AS (
            SELECT DISTINCT UNNEST($1::INT[]) AS item_id
          )
          UPDATE addons_eligible_for_items aefi
          SET
            is_required = $3,
            is_active = $4,
            updated_at = CURRENT_TIMESTAMP
          FROM target_items ti
          WHERE aefi.item_id = ti.item_id
            AND aefi.group_id = $2
            AND aefi.is_deleted = 0
            AND EXISTS (
              SELECT 1
              FROM items i
              WHERE i.id = ti.item_id
                AND i.is_deleted = 0
            )
            AND EXISTS (
              SELECT 1
              FROM addon_group_master ag
              WHERE ag.id = $2
                AND ag.is_deleted = 0
            )
          RETURNING aefi.id;
        `,
        [uniqueItemIds, group_id, is_required, is_active]
      );

      const inserted = await client.query(
        `
          WITH target_items AS (
            SELECT DISTINCT UNNEST($1::INT[]) AS item_id
          ),
          valid_items AS (
            SELECT ti.item_id
            FROM target_items ti
            INNER JOIN items i
              ON i.id = ti.item_id
             AND i.is_deleted = 0
            WHERE EXISTS (
              SELECT 1
              FROM addon_group_master ag
              WHERE ag.id = $2
                AND ag.is_deleted = 0
            )
          )
          INSERT INTO addons_eligible_for_items
          (item_id, group_id, is_required, is_active)
          SELECT vi.item_id, $2, $3, $4
          FROM valid_items vi
          WHERE NOT EXISTS (
            SELECT 1
            FROM addons_eligible_for_items existing
            WHERE existing.item_id = vi.item_id
              AND existing.group_id = $2
              AND existing.is_deleted = 0
          )
          RETURNING id;
        `,
        [uniqueItemIds, group_id, is_required, is_active]
      );

      const eligibilityIds = [
        ...updated.rows.map((row) => Number(row.id)),
        ...inserted.rows.map((row) => Number(row.id)),
      ];

      summary.updated = updated.rowCount || 0;
      summary.created = inserted.rowCount || 0;
      summary.skipped = Math.max(uniqueItemIds.length - summary.updated - summary.created, 0);

      if (eligibilityIds.length) {
        await client.query(
          `DELETE FROM addons_eligible_item_options WHERE eligibility_id = ANY($1::INT[]);`,
          [eligibilityIds]
        );

        await client.query(
          `
            INSERT INTO addons_eligible_item_options (eligibility_id, addon_item_id)
            SELECT eligibility_ids.id, aim.id
            FROM UNNEST($1::INT[]) AS eligibility_ids(id)
            CROSS JOIN addon_item_master aim
            WHERE aim.group_id = $2
              AND aim.id = ANY($3::INT[])
              AND aim.is_deleted = 0
              AND aim.is_active = 1
            ON CONFLICT DO NOTHING;
          `,
          [eligibilityIds, group_id, addon_item_ids]
        );
      }

      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  removeEligibilityOutsideGroups: async (item_ids, group_ids) => {
    if (!item_ids.length) {
      return 0;
    }

    const result = await db.query(
      `
        UPDATE addons_eligible_for_items
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE item_id = ANY($1::INT[])
          AND is_deleted = 0
          AND (
            COALESCE(ARRAY_LENGTH($2::INT[], 1), 0) = 0
            OR group_id <> ALL($2::INT[])
          );
      `,
      [item_ids, group_ids]
    );

    return result.rowCount || 0;
  },

  getEligibilityList: async (limit, offset) => {
    const result = await db.query(
      `
        SELECT
          aefi.*,
          i.item_name,
          i.category_id,
          ag.group_name,
          COALESCE(COUNT(aeio.addon_item_id), 0)::INT AS addon_item_count,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(aeio.addon_item_id ORDER BY aim.addon_item_name), NULL),
            ARRAY[]::INT[]
          ) AS addon_item_ids,
          COALESCE(
            STRING_AGG(aim.addon_item_name, ', ' ORDER BY aim.addon_item_name),
            ''
          ) AS selected_addon_items,
          COUNT(*) OVER()::INT AS total_records
        FROM addons_eligible_for_items aefi
        INNER JOIN items i ON i.id = aefi.item_id
        INNER JOIN addon_group_master ag ON ag.id = aefi.group_id
        LEFT JOIN addons_eligible_item_options aeio ON aeio.eligibility_id = aefi.id
        LEFT JOIN addon_item_master aim
          ON aim.id = aeio.addon_item_id
         AND aim.is_deleted = 0
        WHERE aefi.is_deleted = 0
        GROUP BY aefi.id, i.item_name, i.category_id, ag.group_name
        ORDER BY aefi.id DESC
        LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );
    return result.rows;
  },

  getEligibilityById: async (id) => {
    const result = await db.query(
      `
        SELECT
          aefi.*,
          i.item_name,
          i.category_id,
          ag.group_name,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(aeio.addon_item_id ORDER BY aim.addon_item_name), NULL),
            ARRAY[]::INT[]
          ) AS addon_item_ids,
          COALESCE(
            STRING_AGG(aim.addon_item_name, ', ' ORDER BY aim.addon_item_name),
            ''
          ) AS selected_addon_items
        FROM addons_eligible_for_items aefi
        INNER JOIN items i ON i.id = aefi.item_id
        INNER JOIN addon_group_master ag ON ag.id = aefi.group_id
        LEFT JOIN addons_eligible_item_options aeio ON aeio.eligibility_id = aefi.id
        LEFT JOIN addon_item_master aim
          ON aim.id = aeio.addon_item_id
         AND aim.is_deleted = 0
        WHERE aefi.id = $1
          AND aefi.is_deleted = 0
        GROUP BY aefi.id, i.item_name, i.category_id, ag.group_name;
      `,
      [id]
    );
    return result.rows[0] || null;
  },

  updateEligibility: async (id, item_id, group_id, is_required, is_active, addon_item_ids = []) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query(
        `
          WITH duplicate AS (
            SELECT 1
            FROM addons_eligible_for_items
            WHERE item_id = $2
              AND group_id = $3
              AND id != $1
              AND is_deleted = 0
            LIMIT 1
          )
          UPDATE addons_eligible_for_items
          SET
            item_id = $2,
            group_id = $3,
            is_required = $4,
            is_active = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND is_deleted = 0
            AND EXISTS (SELECT 1 FROM items WHERE id = $2 AND is_deleted = 0)
            AND EXISTS (SELECT 1 FROM addon_group_master WHERE id = $3 AND is_deleted = 0)
            AND NOT EXISTS (SELECT 1 FROM duplicate)
          RETURNING *, EXISTS (SELECT 1 FROM duplicate) AS duplicate_exists;
        `,
        [id, item_id, group_id, is_required, is_active]
      );
      const row = result.rows[0] || null;

      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `DELETE FROM addons_eligible_item_options WHERE eligibility_id = $1;`,
        [id]
      );
      await client.query(
        `
          INSERT INTO addons_eligible_item_options (eligibility_id, addon_item_id)
          SELECT $1, aim.id
          FROM addon_item_master aim
          WHERE aim.group_id = $2
            AND aim.id = ANY($3::INT[])
            AND aim.is_deleted = 0
            AND aim.is_active = 1
          ON CONFLICT DO NOTHING;
        `,
        [id, group_id, addon_item_ids]
      );

      await client.query("COMMIT");
      return row;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  deleteEligibility: async (id) => {
    const result = await db.query(
      `
        UPDATE addons_eligible_for_items
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = 0
        RETURNING *;
      `,
      [id]
    );
    return result.rows[0] || null;
  },

  getAddonsByItem: async (itemId) => {
    const result = await db.query(
      `
        SELECT
          aefi.id AS eligibility_id,
          aefi.item_id,
          aefi.group_id,
          aefi.is_required,
          aefi.sort_order AS group_sort_order,
          ag.group_name,
          aim.id AS addon_item_id,
          aim.addon_item_name,
          aim.price,
          aim.description,
          aeio.sort_order AS item_sort_order
        FROM addons_eligible_for_items aefi
        INNER JOIN addon_group_master ag ON ag.id = aefi.group_id
        INNER JOIN addons_eligible_item_options aeio ON aeio.eligibility_id = aefi.id
        INNER JOIN addon_item_master aim
          ON aim.id = aeio.addon_item_id
         AND aim.group_id = ag.id
        WHERE aefi.item_id = $1
          AND aefi.is_deleted = 0
          AND ag.is_deleted = 0
          AND ag.is_active = 1
          AND aim.is_deleted = 0
          AND aim.is_active = 1
        ORDER BY aefi.sort_order ASC, aefi.id ASC, aeio.sort_order ASC, aeio.id ASC;
      `,
      [itemId]
    );
    return result.rows;
  },

  reorderAddonGroups: async (itemId, orderedGroupIds) => {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < orderedGroupIds.length; i++) {
        const groupId = Number(orderedGroupIds[i]);
        await client.query(
          `
            UPDATE addons_eligible_for_items
            SET sort_order = $3, updated_at = CURRENT_TIMESTAMP
            WHERE item_id = $1 AND group_id = $2 AND is_deleted = 0;
          `,
          [itemId, groupId, i]
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

  reorderAddonItems: async (eligibilityId, orderedAddonItemIds) => {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < orderedAddonItemIds.length; i++) {
        const addonItemId = Number(orderedAddonItemIds[i]);
        await client.query(
          `
            UPDATE addons_eligible_item_options
            SET sort_order = $3
            WHERE eligibility_id = $1 AND addon_item_id = $2;
          `,
          [eligibilityId, addonItemId, i]
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
};

module.exports = addonModel;
