const itemModel = require("./itemModel");
const { attachImageFields } = require("../utils/media");
const { uploadImage } = require("../utils/storageService");
const { publishMenuChangeSafely } = require("../realtime/menuEvents");

const toRealtimeItem = (req, item) =>
  item ? attachImageFields(req, item, ["item_image"]) : null;

const toListItemResponse = (req, item) => {
  const hydratedItem = attachImageFields(req, item, ["category_image", "item_image"]);

  return {
    id: hydratedItem.id,
    category_id: hydratedItem.category_id,
    category_name: hydratedItem.category_name,
    category_image_url: hydratedItem.category_image_url,
    item_name: hydratedItem.item_name,
    item_description: hydratedItem.item_description,
    item_image_url: hydratedItem.item_image_url,
    price: hydratedItem.price,
    discount_price: hydratedItem.discount_price,
    preparation_time: hydratedItem.preparation_time,
    is_popular: hydratedItem.is_popular,
    is_new: hydratedItem.is_new,
    is_veg: hydratedItem.is_veg,
    created_at: hydratedItem.created_at,
    updated_at: hydratedItem.updated_at,
    is_deleted: hydratedItem.is_deleted,
    is_active: hydratedItem.is_active,
  };
};

const normalizeFoodType = (value) => {
  const numericValue = Number(value);
  return [0, 1, 2].includes(numericValue) ? numericValue : 0;
};

const createItem = async (req, res) => {
  try {
    const { category_id, item_name, item_description, price, discount_price, preparation_time, is_popular, is_new, is_veg } = req.body;

    if (!category_id || !item_name || !String(item_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "category_id and item_name are required",
      });
    }

    const normalizedName = String(item_name).trim();
    const uploadedImage = req.file
      ? await uploadImage({ req, file: req.file, folderName: "item-images" })
      : null;
    const normalizedImage = uploadedImage?.path || null;
    const normalizedPrice = price != null ? parseFloat(price) : 0.00;
    const normalizedDiscountPrice = discount_price != null && discount_price !== "" ? parseFloat(discount_price) : null;
    const normalizedPrepTime = preparation_time != null && preparation_time !== "" ? parseInt(preparation_time, 10) : null;
    const normalizedPopular = Number(is_popular) === 1 ? 1 : 0;
    const normalizedNew = Number(is_new) === 1 ? 1 : 0;
    const normalizedVeg = normalizeFoodType(is_veg);

    if (!normalizedImage) {
      return res.status(400).json({
        success: false,
        message: "item_image is required",
      });
    }

    const data = await itemModel.createItem(
      category_id,
      normalizedName,
      item_description || null,
      normalizedImage,
      normalizedPrice,
      normalizedDiscountPrice,
      normalizedPrepTime,
      normalizedPopular,
      normalizedNew,
      normalizedVeg
    );

    if (!data) {
      return res.status(409).json({
        success: false,
        message: "Invalid category or item name already exists in this category",
      });
    }

    await publishMenuChangeSafely({
      entity: "item",
      action: "created",
      entityId: data.id,
      categoryId: data.category_id,
      itemId: data.id,
      entityData: toRealtimeItem(req, data),
    });

    return res.status(200).json({
      success: true,
      message: "Item created successfully",
      data: attachImageFields(req, data, ["item_image"]),
    });
  } catch (error) {
    console.error("Error creating item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getItemList = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.body;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (Number.isNaN(page) || page < 1) {
      page = 1;
    }

    if (Number.isNaN(limit) || limit < 1) {
      limit = 10;
    }

    const offset = (page - 1) * limit;
    const rows = await itemModel.getItemList(limit, offset);
    const totalRecords = rows.length > 0 ? Number(rows[0].total_records) : 0;
    const data = rows.map(({ total_records, ...item }) => toListItemResponse(req, item));
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Item list fetched successfully",
      data,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching item list:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const data = await itemModel.getItemById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: attachImageFields(req, data, ["category_image", "item_image"]),
    });
  } catch (error) {
    console.error("Error fetching item by id:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const {
      id,
      category_id,
      item_name,
      item_description,
      is_active = 1,
      price,
      discount_price,
      preparation_time,
      is_popular,
      is_new,
      is_veg,
    } = req.body;

    if (!id || !category_id || !item_name || !String(item_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "id, category_id and item_name are required",
      });
    }

    const existingItem = await itemModel.getItemById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const normalizedName = String(item_name).trim();
    const uploadedImage = req.file
      ? await uploadImage({ req, file: req.file, folderName: "item-images" })
      : null;
    const normalizedImage = uploadedImage?.path || null;
    const normalizedActive = Number(is_active) === 0 ? 0 : 1;
    const normalizedPrice = price != null ? parseFloat(price) : 0.00;
    const normalizedDiscountPrice = discount_price != null && discount_price !== "" ? parseFloat(discount_price) : null;
    const normalizedPrepTime = preparation_time != null && preparation_time !== "" ? parseInt(preparation_time, 10) : null;
    const normalizedPopular = Number(is_popular) === 1 ? 1 : 0;
    const normalizedNew = Number(is_new) === 1 ? 1 : 0;
    const normalizedVeg = normalizeFoodType(is_veg);

    const data = await itemModel.updateItem(
      id,
      category_id,
      normalizedName,
      item_description || null,
      normalizedImage,
      normalizedActive,
      normalizedPrice,
      normalizedDiscountPrice,
      normalizedPrepTime,
      normalizedPopular,
      normalizedNew,
      normalizedVeg
    );

    if (!data?.category_exists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (data?.duplicate_exists) {
      return res.status(409).json({
        success: false,
        message: "Item name already exists in this category",
      });
    }

    const {
      target_exists,
      category_exists,
      duplicate_exists,
      ...updatedItem
    } = data;

    await publishMenuChangeSafely({
      entity: "item",
      action: "updated",
      entityId: updatedItem.id,
      categoryId: updatedItem.category_id,
      itemId: updatedItem.id,
      previousCategoryId: existingItem.category_id,
      entityData: toRealtimeItem(req, updatedItem),
    });

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: attachImageFields(req, updatedItem, ["item_image"]),
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const existingItem = await itemModel.getItemById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    await itemModel.deleteItem(id);

    await publishMenuChangeSafely({
      entity: "item",
      action: "deleted",
      entityId: existingItem.id,
      categoryId: existingItem.category_id,
      itemId: existingItem.id,
      entityData: toRealtimeItem(req, existingItem),
    });

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  createItem,
  getItemList,
  getItemById,
  updateItem,
  deleteItem,
};
