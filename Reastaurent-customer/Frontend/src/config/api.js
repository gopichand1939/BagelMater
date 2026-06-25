const trimTrailingSlash = (value = "") => String(value || "").replace(/\/+$/g, "");

const getBrowserOrigin = () =>
  typeof window === "undefined" ? "" : window.location.origin;

const toWebSocketOrigin = (value = "") =>
  String(value || "").replace(/^http/i, "ws");

const toWebSocketUrlFromApiBase = (apiBaseUrl = "") => {
  const normalizedApiBaseUrl = trimTrailingSlash(apiBaseUrl);

  if (!normalizedApiBaseUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedApiBaseUrl)) {
    return normalizedApiBaseUrl
      .replace(/^http/i, "ws")
      .replace(/\/api$/i, "/ws");
  }

  if (normalizedApiBaseUrl.startsWith("/")) {
    return `${toWebSocketOrigin(getBrowserOrigin())}${normalizedApiBaseUrl.replace(/\/api$/i, "/ws")}`;
  }

  return "";
};

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || "/api"
);

export const CATEGORY_LIST = `${API_BASE_URL}/categories`;
export const ITEMS_BY_CATEGORY = `${API_BASE_URL}/items-by-category`;
export const ITEM_ADDONS = `${API_BASE_URL}/item-addons`;
export const TOP_PRODUCTS = `${API_BASE_URL}/top-products`;
export const CUSTOMER_REGISTER = `${API_BASE_URL}/auth/register`;
export const CUSTOMER_LOGIN = `${API_BASE_URL}/auth/login`;
export const  CUSTOMER_REFRESH_TOKEN = `${API_BASE_URL}/auth/refresh-token`;
export const CUSTOMER_LOGOUT = `${API_BASE_URL}/auth/logout`;
export const CUSTOMER_CHANGE_PASSWORD = `${API_BASE_URL}/auth/change-password`;
export const CUSTOMER_PROFILE = `${API_BASE_URL}/customer/profile`;
export const CUSTOMER_UPDATE_PROFILE = `${API_BASE_URL}/customer/update-profile`;
export const CUSTOMER_PLACE_ORDER = `${API_BASE_URL}/orders/place-order`;
export const CUSTOMER_MY_ORDERS = `${API_BASE_URL}/orders/my-orders`;
export const CUSTOMER_ORDER_DETAILS = `${API_BASE_URL}/orders/order-details`;
export const CUSTOMER_CREATE_PAYMENT_INTENT = `${API_BASE_URL}/payments/create-payment-intent`;
export const CUSTOMER_CREATE_CHECKOUT_SESSION = `${API_BASE_URL}/payments/create-checkout-session`;
export const CUSTOMER_CONFIRM_PAYMENT = `${API_BASE_URL}/payments/confirm-payment`;
export const CUSTOMER_CONFIRM_CHECKOUT_SESSION = `${API_BASE_URL}/payments/confirm-checkout-session`;
export const CUSTOMER_NOTIFICATION_LIST = `${API_BASE_URL}/notifications/list`;
export const CUSTOMER_NOTIFICATION_BY_ID = `${API_BASE_URL}/notifications/by-id`;
export const CUSTOMER_NOTIFICATION_MARK_READ = `${API_BASE_URL}/notifications/mark-as-read`;
export const CUSTOMER_NOTIFICATION_MARK_ALL_READ = `${API_BASE_URL}/notifications/mark-all-as-read`;
export const CUSTOMER_NOTIFICATION_UNREAD_SUMMARY = `${API_BASE_URL}/notifications/unread-summary`;
export const RESTAURANT_SETTINGS = `${API_BASE_URL}/restaurant/settings`;
export const CUSTOMER_NEAREST_OUTLET = `${API_BASE_URL}/delivery-charges/nearest`;
export const MENU_UPDATES_WS_URL =
  trimTrailingSlash(import.meta.env.VITE_MENU_UPDATES_WS_URL) ||
  toWebSocketUrlFromApiBase(API_BASE_URL) ||
  `${toWebSocketOrigin(getBrowserOrigin())}/ws`;

export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

export const STRIPE_MIN_INR_AMOUNT = Number(
  import.meta.env.VITE_STRIPE_MIN_INR_AMOUNT || 50
);
