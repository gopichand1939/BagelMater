export const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL)

const trimTrailingSlash = (value = "") => String(value || "").replace(/\/+$/g, "");
const getBrowserOrigin = () =>
  typeof window === "undefined" ? "" : window.location.origin;
const isLocalHostName = (host = "") =>
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(String(host || ""));
const toWebSocketOrigin = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(
      normalized,
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    );

    if (/^wss?:$/i.test(parsed.protocol)) {
      return `${parsed.protocol}//${parsed.host}`;
    }

    if (/^https:$/i.test(parsed.protocol)) {
      return `wss://${parsed.host}`;
    }

    if (/^http:$/i.test(parsed.protocol)) {
      return `${isLocalHostName(parsed.hostname) ? "ws" : "wss"}://${parsed.host}`;
    }

    return normalized.replace(/^http/i, "ws");
  } catch (_error) {
    return normalized.replace(/^http/i, "ws");
  }
};

export const CATEGORY_CREATE = `${BACKEND_BASE_URL}/category/create_category`;
export const CATEGORY_LIST = `${BACKEND_BASE_URL}/category/category_list`;
export const CATEGORY_GET = `${BACKEND_BASE_URL}/category/get_category`;
export const CATEGORY_BY_ID = `${BACKEND_BASE_URL}/category/get_category_byId`;
export const CATEGORY_UPDATE = `${BACKEND_BASE_URL}/category/update_category`;
export const CATEGORY_DELETE = `${BACKEND_BASE_URL}/category/delete_category`;
export const CATEGORY_REORDER = `${BACKEND_BASE_URL}/category/reorder_categories`;

export const ITEM_CREATE = `${BACKEND_BASE_URL}/items/create_item`;
export const ITEM_LIST = `${BACKEND_BASE_URL}/items/item_list`;
export const ITEM_BY_ID = `${BACKEND_BASE_URL}/items/get_item_byId`;
export const ITEM_UPDATE = `${BACKEND_BASE_URL}/items/update_item`;
export const ITEM_DELETE = `${BACKEND_BASE_URL}/items/delete_item`;
export const ITEM_REORDER = `${BACKEND_BASE_URL}/items/reorder_items`;

export const TOP_PRODUCT_LIST = `${BACKEND_BASE_URL}/top-products/list`;
export const TOP_PRODUCT_ADD = `${BACKEND_BASE_URL}/top-products/add`;
export const TOP_PRODUCT_UPDATE = `${BACKEND_BASE_URL}/top-products/update`;
export const TOP_PRODUCT_DELETE = `${BACKEND_BASE_URL}/top-products/delete`;
export const TOP_PRODUCT_REORDER = `${BACKEND_BASE_URL}/top-products/reorder`;
export const TOP_PRODUCT_SEARCH_ITEMS = `${BACKEND_BASE_URL}/top-products/search-items`;

export const ADDON_GROUP_CREATE = `${BACKEND_BASE_URL}/addons/create_addon_group`;
export const ADDON_GROUP_LIST = `${BACKEND_BASE_URL}/addons/addon_group_list`;
export const ADDON_GROUP_BY_ID = `${BACKEND_BASE_URL}/addons/add_on_master_getById`;
export const ADDON_GROUP_UPDATE = `${BACKEND_BASE_URL}/addons/update_addon_group`;
export const ADDON_GROUP_DELETE = `${BACKEND_BASE_URL}/addons/delete_addon_group`;

export const ADDON_ITEM_CREATE = `${BACKEND_BASE_URL}/addons/create_addon_item`;
export const ADDON_ITEM_LIST = `${BACKEND_BASE_URL}/addons/addon_item_list`;
export const ADDON_ITEM_BY_ID = `${BACKEND_BASE_URL}/addons/get_addon_item_byId`;
export const ADDON_ITEM_UPDATE = `${BACKEND_BASE_URL}/addons/update_addon_item`;
export const ADDON_ITEM_DELETE = `${BACKEND_BASE_URL}/addons/delete_addon_item`;

export const ADDON_ELIGIBILITY_LOOKUPS = `${BACKEND_BASE_URL}/addons/addon_eligibility_lookups`;
export const ADDON_ITEMS_BY_GROUP = `${BACKEND_BASE_URL}/addons/addon_items_by_group`;
export const ADDON_ELIGIBILITY_CREATE = `${BACKEND_BASE_URL}/addons/create_addon_eligibility`;
export const ADDON_ELIGIBILITY_BULK_ASSIGN = `${BACKEND_BASE_URL}/addons/bulk_assign_addon_eligibility`;
export const ADDON_ELIGIBILITY_LIST = `${BACKEND_BASE_URL}/addons/addon_eligibility_list`;
export const ADDON_ELIGIBILITY_BY_ID = `${BACKEND_BASE_URL}/addons/get_addon_eligibility_byId`;
export const ADDON_ELIGIBILITY_UPDATE = `${BACKEND_BASE_URL}/addons/update_addon_eligibility`;
export const ADDON_ELIGIBILITY_DELETE = `${BACKEND_BASE_URL}/addons/delete_addon_eligibility`;
export const ADDON_BY_ITEM = `${BACKEND_BASE_URL}/addons/get_addons_by_item`;



export const ADMIN_REGISTER = `${BACKEND_BASE_URL}/admin/register`;
export const ADMIN_LOGIN = `${BACKEND_BASE_URL}/admin/login`;
export const ADMIN_REFRESH_TOKEN = `${BACKEND_BASE_URL}/admin/refresh-token`;
export const ADMIN_LOGOUT = `${BACKEND_BASE_URL}/admin/logout`;
export const ADMIN_FORGOT_PASSWORD = `${BACKEND_BASE_URL}/admin/forgot-password`;
export const ADMIN_RESET_PASSWORD = `${BACKEND_BASE_URL}/admin/reset-password`;
export const ADMIN_CHANGE_PASSWORD = `${BACKEND_BASE_URL}/admin/change-password`;
export const ADMIN_PROFILE = `${BACKEND_BASE_URL}/admin/profile`;
export const RESTAURANT_SETTINGS = `${BACKEND_BASE_URL}/restaurant/settings`;
export const RESTAURANT_TOGGLE_STATUS = `${BACKEND_BASE_URL}/restaurant/toggle-status`;
export const DASHBOARD_SUMMARY = `${BACKEND_BASE_URL}/dashboard/summary`;
export const DASHBOARD_CATEGORY_STATS = `${BACKEND_BASE_URL}/dashboard/category-stats`;
export const DASHBOARD_VEG_STATS = `${BACKEND_BASE_URL}/dashboard/veg-stats`;
export const DASHBOARD_ORDER_STATS = `${BACKEND_BASE_URL}/dashboard/order-stats`;
export const ORDER_REPORTS_DASHBOARD = `${BACKEND_BASE_URL}/api/order-reports/dashboard`;
export const ORDER_REPORTS_EXPORT_PDF = `${BACKEND_BASE_URL}/api/order-reports/export/pdf`;
export const ORDER_REPORTS_EXPORT_EXCEL = `${BACKEND_BASE_URL}/api/order-reports/export/excel`;
export const ORDER_REPORTS_EXPORT_CSV = `${BACKEND_BASE_URL}/api/order-reports/export/csv`;




export const CUSTOMER_CREATE = `${BACKEND_BASE_URL}/customer/create_customer`;
export const CUSTOMER_LIST = `${BACKEND_BASE_URL}/customer/customer_list`;
export const CUSTOMER_BY_ID = `${BACKEND_BASE_URL}/customer/get_customer_byId`;
export const CUSTOMER_UPDATE = `${BACKEND_BASE_URL}/customer/update_customer`;
export const CUSTOMER_DELETE = `${BACKEND_BASE_URL}/customer/delete_customer`;

export const ORDER_CREATE = `${BACKEND_BASE_URL}/orders/create_order`;
export const ORDER_LIST = `${BACKEND_BASE_URL}/orders/order_list`;
export const ORDER_BY_ID = `${BACKEND_BASE_URL}/orders/get_order_byId`;
export const ORDER_UPDATE_STATUS = `${BACKEND_BASE_URL}/orders/update_order_status`;
export const ORDER_DELETE = `${BACKEND_BASE_URL}/orders/delete_order`;

export const PAYMENT_LIST = `${BACKEND_BASE_URL}/payments/payment_list`;
export const PAYMENT_BY_ID = `${BACKEND_BASE_URL}/payments/get_payment_byId`;
export const PAYMENT_SUMMARY = `${BACKEND_BASE_URL}/payments/payment_summary`;

export const NOTIFICATION_LIST = `${BACKEND_BASE_URL}/notifications/notification_list`;
export const NOTIFICATION_BY_ID = `${BACKEND_BASE_URL}/notifications/get_notification_byId`;
export const NOTIFICATION_MARK_READ = `${BACKEND_BASE_URL}/notifications/mark_notification_as_read`;
export const NOTIFICATION_MARK_ALL_READ = `${BACKEND_BASE_URL}/notifications/mark_all_notifications_as_read`;
export const NOTIFICATION_DELETE = `${BACKEND_BASE_URL}/notifications/delete_notification`;
export const NOTIFICATION_UNREAD_SUMMARY = `${BACKEND_BASE_URL}/notifications/unread_notification_summary`;

export const MESSAGE_SETTINGS = `${BACKEND_BASE_URL}/messages/settings`;
export const MESSAGE_TEST_MAIL = `${BACKEND_BASE_URL}/messages/test-mail`;
export const OFFERS_SETTINGS = `${BACKEND_BASE_URL}/offers/settings`;
export const DELIVERY_CHARGES_SETTINGS = `${BACKEND_BASE_URL}/delivery-charges/settings`;

export const ADMIN_UPDATES_WS_URL =
  trimTrailingSlash(import.meta.env.VITE_ADMIN_UPDATES_WS_URL) ||
  (BACKEND_BASE_URL
    ? trimTrailingSlash(BACKEND_BASE_URL).replace(/^http/i, "ws") + "/ws"
    : `${toWebSocketOrigin(getBrowserOrigin())}/ws`);

export const APP_TITLE = "Bagel Master Cafe";
