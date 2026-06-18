const db = require("../config/db");
const { attachImageUrl } = require("../media");
const {
  cache,
  isCacheValid,
  setCategoryCache,
  setItemsCache,
} = require("../cache/menuCache");

const getCategory = async (req, res) => {
  try {
    if (isCacheValid(cache.categories)) {
      return res.status(200).json({
        success: true,
        data: cache.categories.data,
        cached: true,
      });
    }

    const result = await db.query(`
      SELECT
        id,
        category_name,
        category_image,
        sort_order
      FROM category
      WHERE is_deleted = 0
        AND is_active = 1
      ORDER BY sort_order ASC, id ASC
    `);

    const categories = result.rows.map((row) =>
      attachImageUrl(req, row, "category_image")
    );

    setCategoryCache(categories);

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

const getItemsByCategory = async (req, res) => {
  try {
    const { category_id, page = 1, limit = 5 } = req.body;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "category_id is required",
      });
    }

    const isAll = category_id === "all" || category_id === 0;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 5;
    const cacheKey = `${category_id}_${pageNumber}_${limitNumber}`;

    if (isCacheValid(cache.items[cacheKey])) {
      return res.status(200).json({
        ...cache.items[cacheKey].data,
        cached: true,
      });
    }

    const offset = (pageNumber - 1) * limitNumber;

    const itemsQuery = `
      SELECT
        id,
        category_id,
        item_name,
        item_description,
        item_image,
        price,
        discount_price,
        preparation_time,
        is_popular,
        is_new,
        is_veg,
        is_active,
        sort_order
      FROM items
      WHERE ${isAll ? "1=1" : "category_id = $1"}
        AND is_deleted = 0
        AND is_active = 1
      ORDER BY sort_order ASC, id ASC
      LIMIT ${isAll ? "$1 OFFSET $2" : "$2 OFFSET $3"}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM items
      WHERE ${isAll ? "1=1" : "category_id = $1"}
        AND is_deleted = 0
        AND is_active = 1
    `;

    const itemsParams = isAll ? [limitNumber, offset] : [category_id, limitNumber, offset];
    const countParams = isAll ? [] : [category_id];

    const [itemsResult, countResult] = await Promise.all([
      db.query(itemsQuery, itemsParams),
      db.query(countQuery, countParams),
    ]);

    const totalItems = parseInt(countResult.rows[0].total, 10) || 0;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limitNumber);
    const items = itemsResult.rows.map((row) => attachImageUrl(req, row, "item_image"));

    const responseData = {
      success: true,
      data: items,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems,
        limit: limitNumber,
      },
    };

    setItemsCache(cacheKey, responseData);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch items",
      error: error.message,
    });
  }
};

const getItemAddons = async (req, res) => {
  try {
    const { item_id } = req.body;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        message: "item_id is required",
      });
    }

    const normalizedItemId = parseInt(item_id, 10);

    if (Number.isNaN(normalizedItemId) || normalizedItemId < 1) {
      return res.status(400).json({
        success: false,
        message: "item_id must be a valid positive number",
      });
    }

    const addonsQuery = `
      SELECT
        aefi.id AS eligibility_id,
        aefi.item_id,
        aefi.group_id,
        aefi.is_required,
        ag.group_name,
        aim.id AS addon_item_id,
        aim.addon_item_name,
        aim.price,
        aim.description
      FROM addons_eligible_for_items aefi
      INNER JOIN addon_group_master ag
        ON ag.id = aefi.group_id
      INNER JOIN addons_eligible_item_options aeio
        ON aeio.eligibility_id = aefi.id
      INNER JOIN addon_item_master aim
        ON aim.id = aeio.addon_item_id
       AND aim.group_id = ag.id
      WHERE aefi.item_id = $1
        AND aefi.is_deleted = 0
        AND aefi.is_active = 1
        AND ag.is_deleted = 0
        AND ag.is_active = 1
        AND aim.is_deleted = 0
        AND aim.is_active = 1
      ORDER BY ag.group_name ASC, aim.addon_item_name ASC
    `;
    const addonsResult = await db.query(addonsQuery, [normalizedItemId]);
    const totalRecords = addonsResult.rowCount || 0;

    const groupedMap = addonsResult.rows.reduce((acc, addon) => {
      if (!acc[addon.group_id]) {
        acc[addon.group_id] = {
          id: addon.eligibility_id,
          group_id: addon.group_id,
          addon_group: addon.group_name,
          title: addon.group_name,
          is_required: Number(addon.is_required) === 1,
          options: [],
        };
      }

      acc[addon.group_id].options.push({
        id: addon.addon_item_id,
        addonOptionId: addon.addon_item_id,
        addon_name: addon.addon_item_name,
        addon_item_name: addon.addon_item_name,
        addon_price: Number(addon.price || 0),
        price: Number(addon.price || 0),
        description: addon.description,
      });

      return acc;
    }, {});

    const responseData = {
      success: true,
      message: "Add-on list fetched successfully",
      data: Object.values(groupedMap),
      pagination: {
        totalRecords,
        totalPages: totalRecords > 0 ? 1 : 0,
        currentPage: 1,
        limit: totalRecords,
      },
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching item addons:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch item addons",
      error: error.message,
    });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        i.id,
        tp.id AS top_product_id,
        tp.sort_order,
        i.item_name,
        i.item_description,
        i.item_image,
        i.price,
        i.discount_price,
        i.is_veg,
        i.is_new,
        i.is_popular,
        c.category_name
      FROM top_products tp
      INNER JOIN items i ON i.id = tp.item_id
      LEFT JOIN category c ON c.id = i.category_id
      WHERE tp.is_deleted = 0
        AND tp.is_active = 1
        AND i.is_deleted = 0
        AND i.is_active = 1
        AND (c.id IS NULL OR (c.is_deleted = 0 AND c.is_active = 1))
      ORDER BY tp.sort_order ASC, tp.id ASC
    `);

    const items = result.rows.map((row) =>
      attachImageUrl(req, row, "item_image")
    );

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top products",
      error: error.message,
    });
  }
};

module.exports = {
  getCategory,
  getItemsByCategory,
  getItemAddons,
  getTopProducts,
};

