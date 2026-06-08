CREATE TABLE item_addons (
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

CREATE INDEX idx_item_addons_item_id ON item_addons(item_id);
CREATE INDEX idx_item_addons_group_name ON item_addons(addon_group, addon_name);

-- Run this ALTER TABLE query if the table already exists:
-- ALTER TABLE item_addons
--   ALTER COLUMN item_id DROP NOT NULL,
--   ADD COLUMN addon_price DECIMAL(10, 2) DEFAULT 0.00,
--   ADD COLUMN sort_order INT DEFAULT 0,
--   ADD COLUMN min_select INT DEFAULT 0,
--   ADD COLUMN max_select INT DEFAULT 99;





BEGIN;

-- 1) Insert Addon as a separate menu (not under menu_management)
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
new_menu AS (
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
  WHERE NOT EXISTS (
    SELECT 1 FROM access_menus WHERE menu_key = 'addon'
  )
  RETURNING menu_id
)
UPDATE access_menus am
SET
  parent_menu_id = NULL,
  menu_name = 'Addon Master',
  route_path = '/addon',
  icon_key = 'addon',
  updated_at = CURRENT_TIMESTAMP
WHERE am.menu_key = 'addon'
  OR am.menu_id IN (SELECT menu_id FROM new_menu);

-- 2) Add allowed actions
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

-- 3) Grant permissions to all existing admins
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

COMMIT;
