import { lazy } from "react";
import { Navigate } from "react-router-dom";
import AppShell from "../components/common/AppShell";
import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";
import { withSuspense } from "./routeHelpers";
import { getFirstAccessibleRoute } from "../Utils/authStorage";

// Pages
const Login = lazy(() => import("../Pages/Login/Login"));
const Register = lazy(() => import("../Pages/Register/Register"));
const Dashboard = lazy(() => import("../components/Dashboard/Dashboard"));
const RestaurantTimings = lazy(() => import("../components/Restaurant/RestaurantTimings"));
const ModulePlaceholder = lazy(() => import("../components/common/ModulePlaceholder"));
const Offers = lazy(() => import("../components/Offers/Offers"));
const OrderReports = lazy(() => import("../components/Reports/OrderReports"));
const DeliveryCharges = lazy(() => import("../components/DeliveryCharges/DeliveryCharges"));

// Category Module
const Category = lazy(() => import("../components/Category/Category"));
const AddCategory = lazy(() => import("../components/Category/AddCategory"));
const ViewCategory = lazy(() => import("../components/Category/ViewCategory"));
const EditCategory = lazy(() => import("../components/Category/EditCategory"));
const DeleteCategory = lazy(() => import("../components/Category/DeleteCategory"));

// Items Module
const Item = lazy(() => import("../components/Items/Item"));
const AddItem = lazy(() => import("../components/Items/AddItem"));
const ViewItem = lazy(() => import("../components/Items/ViewItem"));
const EditItem = lazy(() => import("../components/Items/EditItem"));
const DeleteItem = lazy(() => import("../components/Items/DeleteItem"));

// Addons Module
const Addon = lazy(() => import("../components/Addons/Addon"));
const AddAddon = lazy(() => import("../components/Addons/AddAddon"));
const ViewAddon = lazy(() => import("../components/Addons/ViewAddon"));
const EditAddon = lazy(() => import("../components/Addons/EditAddon"));
const DeleteAddon = lazy(() => import("../components/Addons/DeleteAddon"));
const AddonItemMaster = lazy(() => import("../components/Addons/AddonItemMaster"));
const AddonEligibility = lazy(() => import("../components/Addons/AddonEligibility"));

// Customer Module
const Customer = lazy(() => import("../components/customer/Customer"));
const AddCustomer = lazy(() => import("../components/customer/AddCustomer"));
const ViewCustomer = lazy(() => import("../components/customer/ViewCustomer"));
const EditCustomer = lazy(() => import("../components/customer/EditCustomer"));
const DeleteCustomer = lazy(() => import("../components/customer/DeleteCustomer"));

// Orders Module
const Order = lazy(() => import("../components/Orders/Order"));
const AddOrder = lazy(() => import("../components/Orders/AddOrder"));
const ViewOrder = lazy(() => import("../components/Orders/ViewOrder"));
const EditOrder = lazy(() => import("../components/Orders/EditOrder"));
const DeleteOrder = lazy(() => import("../components/Orders/DeleteOrder"));

// Payments Module
const Payment = lazy(() => import("../components/Payments/Payment"));
const ViewPayment = lazy(() => import("../components/Payments/ViewPayment"));

// Notifications Module
const Notification = lazy(() => import("../components/Notifications/Notification"));
const ViewNotification = lazy(() => import("../components/Notifications/ViewNotification"));
const DeleteNotification = lazy(() => import("../components/Notifications/DeleteNotification"));

// Messages Module
const MessageSettings = lazy(() => import("../components/Messages/MessageSettings"));

const NotFoundRedirect = () => <Navigate to="/login" replace />;

export const authRoutes = [
  {
    path: "login",
    element: withSuspense(<Login />),
  },
  {
    path: "register",
    element: withSuspense(<Register />),
  },
];

export const appRoutes = [
  {
    element: <AppShell />, // Eager load for layout stability
    children: [
      {
        path: "/",
        element: <Navigate to={getFirstAccessibleRoute()} replace />,
      },
      {
        index: true,
        element: withSuspense(<Dashboard />),
      },
      {
        path: "dashboard",
        element: withSuspense(<Dashboard />),
      },
      {
        path: "authentication",
        element: withSuspense(<ModulePlaceholder title="Authentication" />),
      },
      {
        path: "settings",
        element: withSuspense(<ModulePlaceholder title="Settings" />),
      },
      {
        path: "orders",
        element: withSuspense(<Order />),
      },
      {
        path: "payments",
        element: withSuspense(<Payment />),
      },
      {
        path: "reports",
        element: withSuspense(<OrderReports />),
      },
      {
        path: "addorder",
        element: withSuspense(<AddOrder />),
      },
      {
        path: "vieworder/:id",
        element: withSuspense(<ViewOrder />),
      },
      {
        path: "editorder/:id",
        element: withSuspense(<EditOrder />),
      },
      {
        path: "deleteorder/:id",
        element: withSuspense(<DeleteOrder />),
      },
      {
        path: "viewpayment/:id",
        element: withSuspense(<ViewPayment />),
      },
      {
        path: "offers",
        element: withSuspense(<Offers />),
      },
      {
        path: "delivery-charges",
        element: withSuspense(<DeliveryCharges />),
      },
      {
        path: "addon",
        element: withSuspense(<Addon />),
      },
      {
        path: "addaddon",
        element: withSuspense(<AddAddon />),
      },
      {
        path: "viewaddon/:id",
        element: withSuspense(<ViewAddon />),
      },
      {
        path: "editaddon/:id",
        element: withSuspense(<EditAddon />),
      },
      {
        path: "deleteaddon/:id",
        element: withSuspense(<DeleteAddon />),
      },
      {
        path: "addon-items",
        element: withSuspense(<AddonItemMaster />),
      },
      {
        path: "addon-eligibility",
        element: withSuspense(<AddonEligibility />),
      },
      {
        path: "customer",
        element: withSuspense(<Customer />),
      },
      {
        path: "customers",
        element: withSuspense(<Customer />),
      },
      {
        path: "addcustomer",
        element: withSuspense(<AddCustomer />),
      },
      {
        path: "viewcustomer/:id",
        element: withSuspense(<ViewCustomer />),
      },
      {
        path: "editcustomer/:id",
        element: withSuspense(<EditCustomer />),
      },
      {
        path: "deletecustomer/:id",
        element: withSuspense(<DeleteCustomer />),
      },
      {
        path: "reviews",
        element: withSuspense(<ModulePlaceholder title="Reviews" />),
      },
      {
        path: "user-management",
        element: withSuspense(<ModulePlaceholder title="User Management" />),
      },
      {
        path: "notifications",
        element: withSuspense(<Notification />),
      },
      {
        path: "messages",
        element: withSuspense(<MessageSettings />),
      },
      {
        path: "viewnotification/:id",
        element: withSuspense(<ViewNotification />),
      },
      {
        path: "deletenotification/:id",
        element: withSuspense(<DeleteNotification />),
      },
      {
        path: "timings",
        element: withSuspense(<RestaurantTimings />),
      },
      {
        path: "category",
        element: withSuspense(<Category />),
      },
      {
        path: "addcategory",
        element: withSuspense(<AddCategory />),
      },
      {
        path: "viewcategory/:id",
        element: withSuspense(<ViewCategory />),
      },
      {
        path: "editcategory/:id",
        element: withSuspense(<EditCategory />),
      },
      {
        path: "deletecategory/:id",
        element: withSuspense(<DeleteCategory />),
      },
      {
        path: "items",
        element: withSuspense(<Item />),
      },
      {
        path: "additem",
        element: withSuspense(<AddItem />),
      },
      {
        path: "viewitem/:id",
        element: withSuspense(<ViewItem />),
      },
      {
        path: "edititem/:id",
        element: withSuspense(<EditItem />),
      },
      {
        path: "deleteitem/:id",
        element: withSuspense(<DeleteItem />),
      },
    ],
  },
];

export const allRoutes = [
  {
    element: <PublicOnlyRoute />,
    children: authRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: appRoutes,
  },
  {
    path: "*",
    element: withSuspense(<NotFoundRedirect />),
  },
];
