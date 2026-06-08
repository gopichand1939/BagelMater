require("dotenv").config();

const db = require("../config/db");

const groupsToReplace = ["Add Sides", "Add Extras", "Extras Sauce"];

const rows = [
  ["Add Sides", 0, 2, "Chips", 3.50, 1],
  ["Add Sides", 0, 2, "Onion Rings", 3.95, 2],
  ["Add Sides", 0, 2, "Side Salad", 5.00, 3],
  ["Add Sides", 0, 2, "Hummus (Tub)", 3.95, 4],
  ["Add Sides", 0, 2, "Potato Wedges", 4.30, 5],
  ["Add Sides", 0, 2, "Spicy Chicken Bites", 5.70, 6],
  ["Add Sides", 0, 2, "Cheesy Jalapeno Bites (5)", 4.95, 7],
  ["Add Sides", 0, 2, "Cheesy Onion Rings", 4.95, 8],
  ["Add Extras", 0, 5, "Sausage (Halal)", 2.50, 1],
  ["Add Extras", 0, 5, "Turkey Rashers (Halal)", 2.99, 2],
  ["Add Extras", 0, 5, "Turkey Ham (Halal)", 2.50, 3],
  ["Add Extras", 0, 5, "Crispy Chicken (Halal)", 3.50, 4],
  ["Add Extras", 0, 5, "Grilled Chicken (Halal)", 3.50, 5],
  ["Add Extras", 0, 5, "Smoked Salmon", 3.80, 6],
  ["Add Extras", 0, 5, "Avocado", 2.20, 7],
  ["Add Extras", 0, 5, "Guacamole", 2.00, 8],
  ["Add Extras", 0, 5, "Tomatoes", 0.70, 9],
  ["Add Extras", 0, 5, "Sundried Tomatoes", 0.70, 10],
  ["Add Extras", 0, 5, "Mushrooms", 1.00, 11],
  ["Add Extras", 0, 5, "Cucumber", 0.70, 12],
  ["Add Extras", 0, 5, "Gherkin", 0.70, 13],
  ["Add Extras", 0, 5, "Red Onions", 0.70, 14],
  ["Add Extras", 0, 5, "Jalapino", 0.70, 15],
  ["Add Extras", 0, 5, "Olives", 0.70, 16],
  ["Add Extras", 0, 5, "Capers", 0.70, 17],
  ["Add Extras", 0, 5, "Hummus", 0.70, 18],
  ["Add Extras", 0, 5, "Hash Browns", 1.50, 19],
  ["Add Extras", 0, 5, "Egg", 1.70, 20],
  ["Add Extras", 0, 5, "Scrambled egg", 2.50, 21],
  ["Add Extras", 0, 5, "Cheese", 1.50, 22],
  ["Add Extras", 0, 5, "Cream Cheese", 2.00, 23],
  ["Add Extras", 0, 5, "Cheddar cheese", 2.00, 24],
  ["Add Extras", 0, 5, "Halloumi Cheese", 2.99, 25],
  ["Extras Sauce", 0, 3, "Tomato Ketchup", 0.20, 1],
  ["Extras Sauce", 0, 3, "Mayonnaise", 0.20, 2],
  ["Extras Sauce", 0, 3, "Burger Sauce", 0.20, 3],
  ["Extras Sauce", 0, 3, "Chilly Sauce", 0.20, 4],
  ["Extras Sauce", 0, 3, "Sweet Chilly Sauce", 0.20, 5],
  ["Extras Sauce", 0, 3, "Tarter Sauce", 0.20, 6],
  ["Extras Sauce", 0, 3, "Garlic Mayo", 0.20, 7],
  ["Extras Sauce", 0, 3, "Teriyaki Sauce", 0.20, 8],
];

const seedAddonMaster = async () => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
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
    await client.query("ALTER TABLE item_addons ALTER COLUMN item_id DROP NOT NULL;");
    await client.query("ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS min_select INT DEFAULT 0;");
    await client.query("ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS max_select INT DEFAULT 99;");
    await client.query("ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS addon_price DECIMAL(10, 2) DEFAULT 0.00;");
    await client.query("ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;");
    await client.query(
      "DELETE FROM item_addons WHERE item_id IS NULL AND addon_group = ANY($1::text[]);",
      [groupsToReplace]
    );

    for (const row of rows) {
      await client.query(
        `
          INSERT INTO item_addons (
            item_id,
            addon_group,
            min_select,
            max_select,
            addon_name,
            addon_price,
            sort_order,
            is_active
          )
          VALUES (NULL, $1, $2, $3, $4, $5, $6, 1);
        `,
        row
      );
    }

    const countResult = await client.query(
      `
        SELECT addon_group, COUNT(*)::INT AS count
        FROM item_addons
        WHERE item_id IS NULL
          AND addon_group = ANY($1::text[])
          AND is_deleted = 0
        GROUP BY addon_group
        ORDER BY addon_group;
      `,
      [groupsToReplace]
    );

    await client.query("COMMIT");
    console.log("Addon Master seeded:", countResult.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed Addon Master:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
};

seedAddonMaster();
