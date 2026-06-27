const MENU_ROUTE_MAP = {
  dashboard: {
    path: "/dashboard",
    matchPaths: ["/dashboard"],
  },
  authentication: {
    path: "/authentication",
    matchPaths: ["/authentication"],
  },
  settings: {
    path: "",
    matchPaths: ["/settings", "/timings"],
  },
  timings: {
    path: "/timings",
    matchPaths: ["/timings"],
  },
  menu_management: {
    path: "/category",
    matchPaths: [
      "/category",
      "/addcategory",
      "/viewcategory/",
      "/editcategory/",
      "/deletecategory/",
      "/items",
      "/additem",
      "/viewitem/",
      "/edititem/",
      "/deleteitem/",
      "/addon",
      "/addaddon",
      "/viewaddon/",
      "/editaddon/",
      "/deleteaddon/",
      "/addon-items",
      "/addon-eligibility",
      "/top-products"
    ],
  },
  category: {
    path: "/category",
    matchPaths: ["/category", "/addcategory", "/viewcategory/", "/editcategory/", "/deletecategory/"],
  },
  items: {
    path: "/items",
    matchPaths: ["/items", "/additem", "/viewitem/", "/edititem/", "/deleteitem/"],
  },
  addon: {
    path: "/addon",
    matchPaths: ["/addon", "/addaddon", "/viewaddon/", "/editaddon/", "/deleteaddon/"],
  },
  addon_item_master: {
    path: "/addon-items",
    matchPaths: ["/addon-items"],
  },
  addons_eligible_for_items: {
    path: "/addon-eligibility",
    matchPaths: ["/addon-eligibility"],
  },
  top_products: {
    path: "/top-products",
    matchPaths: ["/top-products"],
  },
  offers: {
    path: "/offers",
    matchPaths: ["/offers"],
  },
  delivery_charges: {
    path: "/delivery-charges",
    matchPaths: ["/delivery-charges"],
  },
  orders: {
    path: "/orders",
    matchPaths: ["/orders", "/addorder", "/vieworder/", "/editorder/", "/deleteorder/"],
  },
  scheduled_orders: {
    path: "/scheduled-orders",
    matchPaths: ["/scheduled-orders"],
  },
  payments: {
    path: "/payments",
    matchPaths: ["/payments", "/viewpayment/"],
  },
  reports: {
    path: "/reports",
    matchPaths: ["/reports"],
  },
  customer: {
    path: "/customer",
    matchPaths: ["/customer", "/customers", "/addcustomer", "/viewcustomer/", "/editcustomer/", "/deletecustomer/"],
  },
  customers: {
    path: "/customers",
    matchPaths: ["/customer", "/customers", "/addcustomer", "/viewcustomer/", "/editcustomer/", "/deletecustomer/"],
  },
  reviews: {
    path: "/reviews",
    matchPaths: ["/reviews"],
  },
  user_management: {
    path: "/user-management",
    matchPaths: ["/user-management"],
  },
  notifications: {
    path: "/notifications",
    matchPaths: ["/notifications", "/viewnotification/", "/deletenotification/"],
  },
  messages: {
    path: "/messages",
    matchPaths: ["/messages"],
  },
};

export const getMenuRouteConfig = (menuKey = "") => MENU_ROUTE_MAP[menuKey] || null;

export const getMenuRoutePath = (menuKey = "") => getMenuRouteConfig(menuKey)?.path || "";

export const getMenuMatchPaths = (menuKey = "") => {
  const config = getMenuRouteConfig(menuKey);

  if (!config) {
    return [];
  }

  if (Array.isArray(config.matchPaths) && config.matchPaths.length) {
    return config.matchPaths;
  }

  return config.path ? [config.path] : [];
};
