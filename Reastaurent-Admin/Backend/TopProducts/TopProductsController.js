const topProductsModel = require("./TopProductsModal");
const { attachImageFields } = require("../utils/media");
const { publishMenuChangeSafely } = require("../realtime/menuEvents");

const toListItemResponse = (req, item) => {
  const hydratedItem = attachImageFields(req, item, ["item_image"]);
  return {
    id: hydratedItem.id,
    item_id: hydratedItem.item_id,
    sort_order: hydratedItem.sort_order,
    is_active: hydratedItem.is_active,
    created_at: hydratedItem.created_at,
    updated_at: hydratedItem.updated_at,
    item_name: hydratedItem.item_name,
    item_description: hydratedItem.item_description,
    item_image_url: hydratedItem.item_image_url,
    price: hydratedItem.price,
    discount_price: hydratedItem.discount_price,
    is_veg: hydratedItem.is_veg,
    category_name: hydratedItem.category_name,
  };
};

const getTopProducts = async (req, res) => {
  try {
    const rows = await topProductsModel.getTopProductList();
    const data = rows.map((item) => toListItemResponse(req, item));

    return res.status(200).json({
      success: true,
      message: "Top product list fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const addTopProducts = async (req, res) => {
  try {
    const { item_ids } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "item_ids (non-empty array) is required",
      });
    }

    await topProductsModel.addTopProducts(item_ids);

    await publishMenuChangeSafely({
      entity: "top_products",
      action: "created",
    });

    return res.status(200).json({
      success: true,
      message: "Top products added successfully",
    });
  } catch (error) {
    console.error("Error adding top products:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateTopProduct = async (req, res) => {
  try {
    const { id, is_active } = req.body;

    if (id == null || is_active == null) {
      return res.status(400).json({
        success: false,
        message: "id and is_active are required",
      });
    }

    const data = await topProductsModel.updateTopProduct(id, Number(is_active) === 1 ? 1 : 0);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Top product record not found",
      });
    }

    await publishMenuChangeSafely({
      entity: "top_products",
      action: "updated",
      entityId: id,
    });

    return res.status(200).json({
      success: true,
      message: "Top product updated successfully",
      data,
    });
  } catch (error) {
    console.error("Error updating top product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const deleteTopProduct = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const data = await topProductsModel.deleteTopProduct(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Top product record not found",
      });
    }

    await publishMenuChangeSafely({
      entity: "top_products",
      action: "deleted",
      entityId: id,
    });

    return res.status(200).json({
      success: true,
      message: "Top product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting top product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const reorderTopProducts = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderedIds (non-empty array) are required",
      });
    }

    await topProductsModel.reorderTopProducts(orderedIds);

    await publishMenuChangeSafely({
      entity: "top_products",
      action: "reordered",
    });

    return res.status(200).json({
      success: true,
      message: "Top products reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering top products:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const searchItems = async (req, res) => {
  try {
    const { category_id, search = "" } = req.body;

    const rows = await topProductsModel.searchItemsForTopProducts(category_id, search);
    const data = rows.map((item) => {
      const hydrated = attachImageFields(req, item, ["item_image"]);
      return {
        id: hydrated.id,
        category_id: hydrated.category_id,
        category_name: hydrated.category_name,
        item_name: hydrated.item_name,
        item_description: hydrated.item_description,
        item_image_url: hydrated.item_image_url,
        price: hydrated.price,
        discount_price: hydrated.discount_price,
        is_active: hydrated.is_active,
        is_veg: hydrated.is_veg,
        is_top_product: hydrated.is_top_product,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Items searched successfully",
      data,
    });
  } catch (error) {
    console.error("Error searching items for top products:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getTopProducts,
  addTopProducts,
  updateTopProduct,
  deleteTopProduct,
  reorderTopProducts,
  searchItems,
};
