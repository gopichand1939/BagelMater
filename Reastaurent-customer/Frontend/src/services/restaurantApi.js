import { RESTAURANT_SETTINGS } from "../Utils/Constant";

export const fetchRestaurantSettings = async () => {
  const response = await fetch(RESTAURANT_SETTINGS);
  
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch restaurant settings");
  }

  return data.data;
};
