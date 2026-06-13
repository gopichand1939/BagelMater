const addonModel = require("./addonModel");
const { publishMenuChangeSafely } = require("../realtime/menuEvents");

const toPositiveInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? null : parsed;
};

const toPageLimit = (body = {}) => {
  const page = toPositiveInt(body.page) || 1;
  const limit = toPositiveInt(body.limit) || 10;
  return { page, limit, offset: (page - 1) * limit };
};

const pagedResponse = (res, rows, page, limit, message) => {
  const totalRecords = rows.length > 0 ? Number(rows[0].total_records) : 0;
  const data = rows.map(({ total_records, duplicate_exists, ...row }) => row);

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      totalRecords,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
      currentPage: page,
      limit,
    },
  });
};

const normalizeStatus = (value, fallback = 1) =>
  typeof value === "undefined" ? fallback : Number(value) === 0 ? 0 : 1;

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "undefined" || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const normalizeAddonItemIds = (value) => {
  const source = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      source
        .map((item) => parseInt(item, 10))
        .filter((item) => !Number.isNaN(item) && item > 0)
    )
  );
};

const publishAddonChange = (action, entity, data) =>
  publishMenuChangeSafely({
    entity,
    action,
    entityId: data?.id || null,
    itemId: data?.item_id || null,
    entityData: data,
  });

const createGroup = async (req, res) => {
  try {
    const groupName = String(req.body.group_name || "").trim();
    const description = String(req.body.description || "").trim() || null;
    const isActive = normalizeStatus(req.body.is_active);

    if (!groupName) {
      return res.status(400).json({ success: false, message: "group_name is required" });
    }

    const data = await addonModel.createGroup(groupName, description, isActive);
    if (!data) {
      return res.status(409).json({ success: false, message: "Addon group already exists" });
    }

    await publishAddonChange("created", "addon_group", data);
    return res.status(200).json({ success: true, message: "Addon group created successfully", data });
  } catch (error) {
    console.error("Error creating addon group:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getGroupList = async (req, res) => {
  try {
    const { page, limit, offset } = toPageLimit(req.body);
    const rows = await addonModel.getGroupList(limit, offset);
    return pagedResponse(res, rows, page, limit, "Addon group list fetched successfully");
  } catch (error) {
    console.error("Error fetching addon groups:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getGroupById = async (req, res) => {
  try {
    const id = req.body.id ? toPositiveInt(req.body.id) : null;

    if (!id) {
      const data = await addonModel.getActiveGroups();
      return res.status(200).json({ success: true, data });
    }

    const data = await addonModel.getGroupById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon group not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching addon group:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const updateGroup = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    const groupName = String(req.body.group_name || "").trim();
    const description = String(req.body.description || "").trim() || null;
    const isActive = normalizeStatus(req.body.is_active);

    if (!id || !groupName) {
      return res.status(400).json({ success: false, message: "id and group_name are required" });
    }

    const data = await addonModel.updateGroup(id, groupName, description, isActive);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon group not found or duplicate name exists" });
    }

    await publishAddonChange("updated", "addon_group", data);
    return res.status(200).json({ success: true, message: "Addon group updated successfully", data });
  } catch (error) {
    console.error("Error updating addon group:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const data = await addonModel.deleteGroup(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon group not found" });
    }

    await publishAddonChange("deleted", "addon_group", data);
    return res.status(200).json({ success: true, message: "Addon group deleted successfully" });
  } catch (error) {
    console.error("Error deleting addon group:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const createAddonItem = async (req, res) => {
  try {
    const groupId = toPositiveInt(req.body.group_id);
    const name = String(req.body.addon_item_name || "").trim();
    const price = req.body.price != null && req.body.price !== "" ? parseFloat(req.body.price) : 0;
    const description = String(req.body.description || "").trim() || null;
    const isActive = normalizeStatus(req.body.is_active);

    if (!groupId || !name) {
      return res.status(400).json({ success: false, message: "group_id and addon_item_name are required" });
    }

    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: "price must be a valid positive number" });
    }

    const data = await addonModel.createItem(groupId, name, price, description, isActive);
    if (!data) {
      return res.status(409).json({ success: false, message: "Addon item already exists for this group or group not found" });
    }

    await publishAddonChange("created", "addon_item", data);
    return res.status(200).json({ success: true, message: "Addon item created successfully", data });
  } catch (error) {
    console.error("Error creating addon item:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getAddonItemList = async (req, res) => {
  try {
    const { page, limit, offset } = toPageLimit(req.body);
    const rows = await addonModel.getItemList(limit, offset);
    return pagedResponse(res, rows, page, limit, "Addon item list fetched successfully");
  } catch (error) {
    console.error("Error fetching addon items:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getAddonItemById = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const data = await addonModel.getItemById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon item not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching addon item:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const updateAddonItem = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    const groupId = toPositiveInt(req.body.group_id);
    const name = String(req.body.addon_item_name || "").trim();
    const price = req.body.price != null && req.body.price !== "" ? parseFloat(req.body.price) : 0;
    const description = String(req.body.description || "").trim() || null;
    const isActive = normalizeStatus(req.body.is_active);

    if (!id || !groupId || !name) {
      return res.status(400).json({ success: false, message: "id, group_id and addon_item_name are required" });
    }

    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: "price must be a valid positive number" });
    }

    const data = await addonModel.updateItem(id, groupId, name, price, description, isActive);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon item not found, duplicate item exists, or group not found" });
    }

    await publishAddonChange("updated", "addon_item", data);
    return res.status(200).json({ success: true, message: "Addon item updated successfully", data });
  } catch (error) {
    console.error("Error updating addon item:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const deleteAddonItem = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const data = await addonModel.deleteItem(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon item not found" });
    }

    await publishAddonChange("deleted", "addon_item", data);
    return res.status(200).json({ success: true, message: "Addon item deleted successfully" });
  } catch (error) {
    console.error("Error deleting addon item:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getEligibilityLookups = async (_req, res) => {
  try {
    const [items, groups, categories] = await Promise.all([
      addonModel.getActiveMenuItems(),
      addonModel.getActiveGroups(),
      addonModel.getActiveCategories(),
    ]);

    return res.status(200).json({ success: true, data: { items, groups, categories } });
  } catch (error) {
    console.error("Error fetching addon eligibility lookups:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const resolveTargetItemIds = (targetMode, body) => {
  const items = Array.isArray(body.items) ? body.items : [];
  const rawItemIds = normalizeAddonItemIds(body.item_ids);

  if (targetMode === "all_items") {
    return items.map((item) => Number(item.item_id)).filter((id) => id > 0);
  }

  if (targetMode === "category_items") {
    const categoryIds = normalizeAddonItemIds(body.category_ids);
    return items
      .filter((item) => categoryIds.includes(Number(item.category_id)))
      .map((item) => Number(item.item_id))
      .filter((id) => id > 0);
  }

  return rawItemIds;
};

const getAddonItemsByGroup = async (req, res) => {
  try {
    const groupId = toPositiveInt(req.body.group_id);

    if (!groupId) {
      return res.status(400).json({ success: false, message: "group_id is required" });
    }

    const data = await addonModel.getActiveItemsByGroup(groupId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching addon items by group:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const createEligibility = async (req, res) => {
  try {
    const itemId = toPositiveInt(req.body.item_id);
    const groupId = toPositiveInt(req.body.group_id);
    const isRequired = normalizeStatus(req.body.is_required, 0);
    const isActive = normalizeStatus(req.body.is_active);
    const addonItemIds = normalizeAddonItemIds(req.body.addon_item_ids);

    if (!itemId || !groupId) {
      return res.status(400).json({ success: false, message: "item_id and group_id are required" });
    }

    if (!addonItemIds.length) {
      return res.status(400).json({ success: false, message: "Select at least one addon item for this group" });
    }

    const validAddonItemIds = await addonModel.validateAddonItemsForGroup(groupId, addonItemIds);
    if (validAddonItemIds.length !== addonItemIds.length) {
      return res.status(400).json({ success: false, message: "One or more addon items do not belong to selected group" });
    }

    const data = await addonModel.createEligibility(
      itemId,
      groupId,
      isRequired,
      isActive,
      validAddonItemIds
    );
    if (!data) {
      return res.status(409).json({ success: false, message: "Eligibility already exists or item/group not found" });
    }

    await publishAddonChange("created", "addon_eligibility", data);
    return res.status(200).json({ success: true, message: "Addon eligibility created successfully", data });
  } catch (error) {
    console.error("Error creating addon eligibility:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const bulkAssignEligibility = async (req, res) => {
  try {
    const assignments = Array.isArray(req.body.assignments) && req.body.assignments.length
      ? req.body.assignments
      : [req.body];
    const targetMode = String(req.body.target_mode || "selected_items");

    const allItems = await addonModel.getActiveMenuItems();
    const itemIds = resolveTargetItemIds(targetMode, { ...req.body, items: allItems });

    if (!itemIds.length) {
      return res.status(400).json({ success: false, message: "Select at least one target item" });
    }

    const validItemIds = new Set(allItems.map((item) => Number(item.item_id)));
    const normalizedItemIds = Array.from(new Set(itemIds)).filter((itemId) => validItemIds.has(itemId));

    if (!normalizedItemIds.length) {
      return res.status(400).json({ success: false, message: "Selected target items are not active or not found" });
    }

    const summary = { created: 0, updated: 0, skipped: 0, groups: 0 };
    const publishedAssignments = [];
    const validatedAssignments = [];
    const replaceExisting = normalizeBoolean(req.body.replace_existing, false);

    for (const assignment of assignments) {
      const groupId = toPositiveInt(assignment.group_id);
      const isRequired = normalizeStatus(assignment.is_required, 0);
      const isActive = normalizeStatus(assignment.is_active);
      const addonItemIds = normalizeAddonItemIds(assignment.addon_item_ids);

      if (!groupId) {
        return res.status(400).json({ success: false, message: "Each addon group needs valid group_id" });
      }

      if (!addonItemIds.length) {
        return res.status(400).json({ success: false, message: "Each addon group needs at least one selected addon item" });
      }

      const validAddonItemIds = await addonModel.validateAddonItemsForGroup(groupId, addonItemIds);
      if (validAddonItemIds.length !== addonItemIds.length) {
        return res.status(400).json({ success: false, message: "One or more addon items do not belong to selected group" });
      }

      validatedAssignments.push({
        groupId,
        isRequired,
        isActive,
        addonItemIds: validAddonItemIds,
      });
    }

    if (replaceExisting) {
      await addonModel.removeEligibilityOutsideGroups(
        normalizedItemIds,
        validatedAssignments.map((assignment) => assignment.groupId)
      );
    }

    for (const assignment of validatedAssignments) {
      const result = await addonModel.bulkAssignEligibility(
        normalizedItemIds,
        assignment.groupId,
        assignment.isRequired,
        assignment.isActive,
        assignment.addonItemIds
      );

      summary.created += result.created || 0;
      summary.updated += result.updated || 0;
      summary.skipped += result.skipped || 0;
      summary.groups += 1;
      publishedAssignments.push({
        group_id: assignment.groupId,
        addon_item_ids: assignment.addonItemIds,
      });
    }

    await publishAddonChange("bulk_assigned", "addon_eligibility", {
      id: normalizedItemIds[0] || null,
      item_ids: normalizedItemIds,
      assignments: publishedAssignments,
      summary,
    });

    return res.status(200).json({
      success: true,
      message: "Addon eligibility assigned successfully",
      data: summary,
    });
  } catch (error) {
    console.error("Error bulk assigning addon eligibility:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getEligibilityList = async (req, res) => {
  try {
    const { page, limit, offset } = toPageLimit(req.body);
    const rows = await addonModel.getEligibilityList(limit, offset);
    return pagedResponse(res, rows, page, limit, "Addon eligibility list fetched successfully");
  } catch (error) {
    console.error("Error fetching addon eligibility list:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getEligibilityById = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const data = await addonModel.getEligibilityById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon eligibility not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching addon eligibility:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const updateEligibility = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    const itemId = toPositiveInt(req.body.item_id);
    const groupId = toPositiveInt(req.body.group_id);
    const isRequired = normalizeStatus(req.body.is_required, 0);
    const isActive = normalizeStatus(req.body.is_active);
    const addonItemIds = normalizeAddonItemIds(req.body.addon_item_ids);

    if (!id || !itemId || !groupId) {
      return res.status(400).json({ success: false, message: "id, item_id and group_id are required" });
    }

    if (!addonItemIds.length) {
      return res.status(400).json({ success: false, message: "Select at least one addon item for this group" });
    }

    const validAddonItemIds = await addonModel.validateAddonItemsForGroup(groupId, addonItemIds);
    if (validAddonItemIds.length !== addonItemIds.length) {
      return res.status(400).json({ success: false, message: "One or more addon items do not belong to selected group" });
    }

    const data = await addonModel.updateEligibility(
      id,
      itemId,
      groupId,
      isRequired,
      isActive,
      validAddonItemIds
    );
    if (!data) {
      return res.status(404).json({ success: false, message: "Eligibility not found, duplicate mapping exists, or item/group not found" });
    }

    await publishAddonChange("updated", "addon_eligibility", data);
    return res.status(200).json({ success: true, message: "Addon eligibility updated successfully", data });
  } catch (error) {
    console.error("Error updating addon eligibility:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const deleteEligibility = async (req, res) => {
  try {
    const id = toPositiveInt(req.body.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required" });
    }

    const data = await addonModel.deleteEligibility(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Addon eligibility not found" });
    }

    await publishAddonChange("deleted", "addon_eligibility", data);
    return res.status(200).json({ success: true, message: "Addon eligibility deleted successfully" });
  } catch (error) {
    console.error("Error deleting addon eligibility:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getAddonsByItem = async (req, res) => {
  try {
    const itemId = toPositiveInt(req.body.item_id);
    if (!itemId) {
      return res.status(400).json({ success: false, message: "item_id is required" });
    }

    const rows = await addonModel.getAddonsByItem(itemId);
    const groupedMap = rows.reduce((acc, row) => {
      if (!acc[row.group_id]) {
        acc[row.group_id] = {
          id: row.eligibility_id,
          group_id: row.group_id,
          addon_group: row.group_name,
          title: row.group_name,
          is_required: Number(row.is_required) === 1,
          options: [],
        };
      }

      acc[row.group_id].options.push({
        id: row.addon_item_id,
        addonOptionId: row.addon_item_id,
        addon_name: row.addon_item_name,
        addon_item_name: row.addon_item_name,
        addon_price: Number(row.price || 0),
        price: Number(row.price || 0),
        description: row.description,
      });
      return acc;
    }, {});

    return res.status(200).json({ success: true, data: Object.values(groupedMap) });
  } catch (error) {
    console.error("Error fetching add-ons by item:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

module.exports = {
  createGroup,
  getGroupList,
  getGroupById,
  updateGroup,
  deleteGroup,



  createAddonItem,
  getAddonItemList,
  getAddonItemById,
  updateAddonItem,
  deleteAddonItem,


  getEligibilityLookups,
  getAddonItemsByGroup,


  createEligibility,
  bulkAssignEligibility,
  getEligibilityList,
  getEligibilityById,
  updateEligibility,
  deleteEligibility,
  getAddonsByItem,
  
};
