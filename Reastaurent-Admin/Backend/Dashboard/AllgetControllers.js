const db = require("../config/db");

// 1. Get Summary Stats (Total Items, Total Categories)
const getSummaryStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM items WHERE is_deleted = 0) as total_items,
        (SELECT COUNT(*) FROM category WHERE is_deleted = 0) as total_categories
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalItems: parseInt(result.rows[0].total_items, 10),
        totalCategories: parseInt(result.rows[0].total_categories, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching summary stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch summary statistics",
      error: error.message,
    });
  }
};

// 2. Get Category Stats for Pie Chart (Items per category)
const getCategoryStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.category_name,
        COUNT(i.id)::INT as item_count
      FROM category c
      LEFT JOIN items i ON i.category_id = c.id AND i.is_deleted = 0
      WHERE c.is_deleted = 0
      GROUP BY c.id, c.category_name
      ORDER BY item_count DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching category stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category statistics",
      error: error.message,
    });
  }
};

// 3. Get Food type stats for Pie Chart
const getVegStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        CASE 
          WHEN is_veg = 1 THEN 'Veg'
          WHEN is_veg = 2 THEN 'Both / Not applicable'
          ELSE 'Non-Veg'
        END as type,
        COUNT(*)::INT as count
      FROM items
      WHERE is_deleted = 0
      GROUP BY is_veg
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching veg stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch veg statistics",
      error: error.message,
    });
  }
};

// 4. Get Order stats (Delivered, Pending, Today's Count)
const getOrderStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE order_status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE order_status NOT IN ('delivered', 'cancelled')) as pending_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count
      FROM orders
      WHERE is_deleted = 0
    `);

    return res.status(200).json({
      success: true,
      data: {
        deliveredCount: parseInt(result.rows[0].delivered_count, 10),
        pendingCount: parseInt(result.rows[0].pending_count, 10),
        todayCount: parseInt(result.rows[0].today_count, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getSummaryStats,
  getCategoryStats,
  getVegStats,
  getOrderStats,
};
