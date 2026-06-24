import { TOP_PRODUCTS } from "../Utils/Constant";

export const fetchTopProducts = async () => {
  const response = await fetch(TOP_PRODUCTS);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load top products");
  }

  return Array.isArray(data.data) ? data.data : [];
};
