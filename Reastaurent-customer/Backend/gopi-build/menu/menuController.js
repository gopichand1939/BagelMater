const db = require("../config/db");
const { attachImageUrl } = require("../media");
const {
  cache,
  isCacheValid,
  setAddonsCache,
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
        category_image
      FROM category
      WHERE is_deleted = 0
        AND is_active = 1
      ORDER BY id
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
        is_active
      FROM items
      WHERE ${isAll ? "1=1" : "category_id = $1"}
        AND is_deleted = 0
        AND is_active = 1
      ORDER BY id DESC
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

    const cacheKey = `${item_id}_master_all`;

    if (isCacheValid(cache.addons[cacheKey])) {
      return res.status(200).json({
        ...cache.addons[cacheKey].data,
        cached: true,
      });
    }

    const addonsQuery = `
      SELECT
        ia.id,
        ia.item_id,
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
      WHERE ia.item_id IS NULL
        AND ia.is_deleted = 0
        AND ia.is_active = 1
      ORDER BY ia.addon_group ASC, ia.sort_order ASC, ia.id ASC
    `;

    const addonsResult = await db.query(addonsQuery);
    const totalRecords = addonsResult.rowCount || 0;
    const groupedMap = addonsResult.rows.reduce((acc, addon) => {
      if (!acc[addon.addon_group]) {
        acc[addon.addon_group] = {
          addon_group: addon.addon_group,
          title: addon.addon_group,
          min_select: Number(addon.min_select || 0),
          max_select: Number(addon.max_select || 99),
          options: [],
        };
      }

      acc[addon.addon_group].options.push({
        id: addon.id,
        addonOptionId: addon.id,
        addon_name: addon.addon_name,
        addon_price: Number(addon.addon_price || 0),
        sort_order: Number(addon.sort_order || 0),
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

    setAddonsCache(cacheKey, responseData);

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

module.exports = {
  getCategory,
  getItemsByCategory,
  getItemAddons,
};
