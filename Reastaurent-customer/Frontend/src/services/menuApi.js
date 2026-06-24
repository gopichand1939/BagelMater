import {
  CATEGORY_LIST,
  ITEM_ADDONS,
  ITEMS_BY_CATEGORY,
} from "../Utils/Constant";

const postJson = async (url, body = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Request failed for ${url}`);
  }

  return data;
};

export const fetchCategories = async () => {
  const data = await postJson(CATEGORY_LIST);
  return data.data || [];
};

export const fetchItemsByCategory = async (categoryId, page = 1, limit = 12, search = "") => {
  const data = await postJson(ITEMS_BY_CATEGORY, {
    category_id: categoryId,
    page,
    limit,
    search,
  });

  return data;
};

const normalizeAddonGroups = (addonData = []) => {
  if (!Array.isArray(addonData)) {
    return [];
  }

  return addonData.flatMap((group) => {
    if (Array.isArray(group.options)) {
      return group.options.map((option) => ({
        ...option,
        addon_group: group.addon_group || group.title || "Add-ons",
        title: group.title || group.addon_group || "Add-ons",
        min_select: Number(group.min_select || 0),
        max_select: Number(group.max_select || 0),
      }));
    }

    return group;
  });
};

export const fetchItemAddons = async (itemId) => {
  const data = await postJson(ITEM_ADDONS, {
    item_id: itemId,
  });

  return normalizeAddonGroups(data.data);
};
