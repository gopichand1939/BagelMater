const addonModel = require("./addonModel");
const { publishMenuChangeSafely } = require("../realtime/menuEvents");

const createAddon = async (req, res) => {
  try {
    const { addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active } = req.body;

    if (!addon_group || !String(addon_group).trim() || !addon_name || !String(addon_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "addon_group and addon_name are required",
      });
    }

    const normalizedGroup = String(addon_group).trim();
    const normalizedMinSelect = min_select != null && min_select !== "" ? parseInt(min_select, 10) : 0;
    const normalizedMaxSelect = max_select != null && max_select !== "" ? parseInt(max_select, 10) : 99;
    const normalizedName = String(addon_name).trim();
    const normalizedPrice = addon_price != null && addon_price !== "" ? parseFloat(addon_price) : 0.0;
    const normalizedSortOrder = sort_order != null && sort_order !== "" ? parseInt(sort_order, 10) : 0;
    const normalizedActive = Number(is_active) === 0 ? 0 : 1;

    if (Number.isNaN(normalizedPrice) || normalizedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "addon_price must be a valid positive number",
      });
    }

    if (
      Number.isNaN(normalizedMinSelect) ||
      Number.isNaN(normalizedMaxSelect) ||
      normalizedMinSelect < 0 ||
      normalizedMaxSelect < 1 ||
      normalizedMinSelect > normalizedMaxSelect
    ) {
      return res.status(400).json({
        success: false,
        message: "min_select and max_select must be valid selection limits",
      });
    }

    if (Number.isNaN(normalizedSortOrder) || normalizedSortOrder < 0) {
      return res.status(400).json({
        success: false,
        message: "sort_order must be a valid positive number",
      });
    }

    const data = await addonModel.createAddon(
      normalizedGroup,
      normalizedMinSelect,
      normalizedMaxSelect,
      normalizedName,
      normalizedPrice,
      normalizedSortOrder,
      normalizedActive
    );

    if (!data) {
      return res.status(409).json({
        success: false,
        message: "Add-on already exists in this master group",
      });
    }

    await addonModel.syncAddonGroupLimits(
      data.addon_group,
      normalizedMinSelect,
      normalizedMaxSelect
    );

    await publishMenuChangeSafely({
      entity: "addon",
      action: "created",
      entityId: data.id,
      itemId: null,
      entityData: data,
    });

    return res.status(200).json({
      success: true,
      message: "Add-on created successfully",
      data,
    });
  } catch (error) {
    console.error("Error creating add-on:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAddonList = async (req, res) => {
  try {
    let { page = 1, limit = 10, addon_group = null } = req.body;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (Number.isNaN(page) || page < 1) {
      page = 1;
    }

    if (Number.isNaN(limit) || limit < 1) {
      limit = 10;
    }

    const normalizedGroup = addon_group && String(addon_group).trim() ? String(addon_group).trim() : null;
    const offset = (page - 1) * limit;
    const rows = await addonModel.getAddonList(limit, offset, normalizedGroup);
    const totalRecords = rows.length > 0 ? Number(rows[0].total_records) : 0;
    const data = rows.map(({ total_records, ...item }) => item);
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Add-on list fetched successfully",
      data,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching add-on list:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAddonById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const normalizedId = parseInt(id, 10);
    if (Number.isNaN(normalizedId) || normalizedId < 1) {
      return res.status(400).json({
        success: false,
        message: "id must be a valid positive number",
      });
    }

    const data = await addonModel.getAddonById(normalizedId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Add-on not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching add-on by id:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateAddon = async (req, res) => {
  try {
    const { id, addon_group, min_select, max_select, addon_name, addon_price, sort_order, is_active = 1 } = req.body;

    if (!id || !addon_group || !String(addon_group).trim() || !addon_name || !String(addon_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "id, addon_group and addon_name are required",
      });
    }

    const existingAddon = await addonModel.getAddonById(id);
    if (!existingAddon) {
      return res.status(404).json({
        success: false,
        message: "Add-on not found",
      });
    }

    const normalizedId = parseInt(id, 10);
    const normalizedGroup = String(addon_group).trim();
    const normalizedMinSelect = min_select != null && min_select !== "" ? parseInt(min_select, 10) : 0;
    const normalizedMaxSelect = max_select != null && max_select !== "" ? parseInt(max_select, 10) : 99;
    const normalizedName = String(addon_name).trim();
    const normalizedPrice = addon_price != null && addon_price !== "" ? parseFloat(addon_price) : 0.0;
    const normalizedSortOrder = sort_order != null && sort_order !== "" ? parseInt(sort_order, 10) : 0;
    const normalizedActive = Number(is_active) === 0 ? 0 : 1;

    if (Number.isNaN(normalizedId) || normalizedId < 1) {
      return res.status(400).json({
        success: false,
        message: "id must be a valid positive number",
      });
    }

    if (Number.isNaN(normalizedPrice) || normalizedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "addon_price must be a valid positive number",
      });
    }

    if (
      Number.isNaN(normalizedMinSelect) ||
      Number.isNaN(normalizedMaxSelect) ||
      normalizedMinSelect < 0 ||
      normalizedMaxSelect < 1 ||
      normalizedMinSelect > normalizedMaxSelect
    ) {
      return res.status(400).json({
        success: false,
        message: "min_select and max_select must be valid selection limits",
      });
    }

    if (Number.isNaN(normalizedSortOrder) || normalizedSortOrder < 0) {
      return res.status(400).json({
        success: false,
        message: "sort_order must be a valid positive number",
      });
    }

    const data = await addonModel.updateAddon(
      normalizedId,
      normalizedGroup,
      normalizedMinSelect,
      normalizedMaxSelect,
      normalizedName,
      normalizedPrice,
      normalizedSortOrder,
      normalizedActive
    );

    if (!data?.item_exists) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (data?.duplicate_exists) {
      return res.status(409).json({
        success: false,
        message: "Add-on already exists in this master group",
      });
    }

    const {
      target_exists,
      item_exists,
      duplicate_exists,
      ...updatedAddon
    } = data;

    await addonModel.syncAddonGroupLimits(
      updatedAddon.addon_group,
      normalizedMinSelect,
      normalizedMaxSelect
    );

    await publishMenuChangeSafely({
      entity: "addon",
      action: "updated",
      entityId: updatedAddon.id,
      itemId: null,
      previousItemId: existingAddon.item_id,
      entityData: updatedAddon,
    });

    return res.status(200).json({
      success: true,
      message: "Add-on updated successfully",
      data: updatedAddon,
    });
  } catch (error) {
    console.error("Error updating add-on:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const deleteAddon = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const normalizedId = parseInt(id, 10);
    if (Number.isNaN(normalizedId) || normalizedId < 1) {
      return res.status(400).json({
        success: false,
        message: "id must be a valid positive number",
      });
    }

    const existingAddon = await addonModel.getAddonById(normalizedId);
    if (!existingAddon) {
      return res.status(404).json({
        success: false,
        message: "Add-on not found",
      });
    }

    await addonModel.deleteAddon(normalizedId);

    await publishMenuChangeSafely({
      entity: "addon",
      action: "deleted",
      entityId: existingAddon.id,
      itemId: null,
      entityData: existingAddon,
    });

    return res.status(200).json({
      success: true,
      message: "Add-on deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting add-on:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAddonsByItem = async (req, res) => {
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

    const rows = await addonModel.getAddonsByItem(normalizedItemId);
    const groupedMap = rows.reduce((acc, row) => {
      if (!acc[row.addon_group]) {
        acc[row.addon_group] = {
          addon_group: row.addon_group,
          title: row.addon_group,
          min_select: Number(row.min_select || 0),
          max_select: Number(row.max_select || 99),
          options: [],
        };
      }

      acc[row.addon_group].options.push({
        id: row.id,
        addonOptionId: row.id,
        addon_name: row.addon_name,
        addon_price: Number(row.addon_price || 0),
        sort_order: Number(row.sort_order || 0),
      });
      return acc;
    }, {});

    const groupedData = Object.values(groupedMap);

    return res.status(200).json({
      success: true,
      data: groupedData,
    });
  } catch (error) {
    console.error("Error fetching add-ons by item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  createAddon,
  getAddonList,
  getAddonById,
  updateAddon,
  deleteAddon,
  getAddonsByItem,
};
