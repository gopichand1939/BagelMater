import {
  CATEGORY_LIST,
  ITEM_ADDONS,
  ITEMS_BY_CATEGORY,
  TOP_PRODUCTS,
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

export const fetchItemsByCategory = async (categoryId, page = 1, limit = 12) => {
  const data = await postJson(ITEMS_BY_CATEGORY, {
    category_id: categoryId,
    page,
    limit,
  });

  return data;
};

export const fetchItemAddons = async (itemId) => {
  const data = await postJson(ITEM_ADDONS, {
    item_id: itemId,
  });

  return data.data || [];
};

export const fetchTopProducts = async () => {
  const data = await postJson(TOP_PRODUCTS);
  return data.data || [];
};

