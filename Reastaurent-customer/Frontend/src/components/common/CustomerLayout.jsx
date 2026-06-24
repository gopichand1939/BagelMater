import { useEffect, useEffectEvent, useRef, useState, lazy, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

import {
  fetchCategories,
  fetchItemAddons,
  fetchItemsByCategory,
} from "../../services/menuApi";
import {
  applyAddonChange,
  applyCategoryChange,
  applyItemChange,
} from "../../realtime/applyMenuChange";
import { fetchRestaurantSettings } from "../../services/restaurantApi";
import { useMenuUpdates } from "../../realtime/useMenuUpdates";
import { useCustomerRealtimeUpdates } from "../../realtime/useCustomerRealtimeUpdates";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import { fetchCustomerProfile } from "../../services/customerProfileApi";
import { fetchCustomerUnreadNotificationSummary } from "../../services/customerNotificationApi";
import { confirmCustomerCheckoutSession } from "../../services/paymentApi";
import {
  startCustomerNotificationAlert,
  stopCustomerNotificationAlert,
} from "../../Utils/notificationSound";

const ProductModal = lazy(() => import("../Menu/ProductModal"));
const AuthModal = lazy(() => import("../customer/AuthModal"));
const CustomerDashboardModal = lazy(() => import("../customer/CustomerDashboardModal"));
const NotificationDrawer = lazy(() => import("../customer/NotificationDrawer"));

function Home() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState(null);
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [addonCache, setAddonCache] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemAddons, setSelectedItemAddons] = useState([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [loadingAddons, setLoadingAddons] = useState(false);
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("profile");
  
  const [customer, setCustomer] = useState(customerAuthStorage.getCustomer());
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [notificationsRefreshKey, setNotificationsRefreshKey] = useState(0);
  const [notificationSummary, setNotificationSummary] = useState({
    unreadCount: 0,
    notifications: [],
  });
  const [checkoutResult, setCheckoutResult] = useState({
    status: "idle",
    message: "",
    order: null,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchRef = useRef("");

  const selectedCategoryRef = useRef(selectedCategory);
  const selectedItemRef = useRef(selectedItem);
  const itemsRef = useRef(items);
  const addonCacheRef = useRef(addonCache);
  const selectedItemAddonsRef = useRef(selectedItemAddons);
  const skipNextSelectedCategoryFetchRef = useRef(false);
  const previousNotificationCountRef = useRef(0);
  const hasLoadedNotificationSummaryRef = useRef(false);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    addonCacheRef.current = addonCache;
  }, [addonCache]);

  useEffect(() => {
    selectedItemAddonsRef.current = selectedItemAddons;
  }, [selectedItemAddons]);

  const loadCategories = useEffectEvent(async (preferredCategoryId = null) => {
    setLoadingCategories(true);

    try {
      const rawCategories = await fetchCategories();
      const nextCategories = [
        { id: "all", category_name: "All", category_image: null },
        ...rawCategories,
      ];

      const requestedCategoryId =
        preferredCategoryId ?? selectedCategoryRef.current;

      const hasRequestedCategory = nextCategories.some(
        (category) => String(category.id) === String(requestedCategoryId)
      );

      const nextSelectedCategory = hasRequestedCategory
        ? requestedCategoryId
        : null;

      setCategories(nextCategories);
      setSelectedCategory(nextSelectedCategory);

      return nextSelectedCategory;
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
      setSelectedCategory(null);
      return null;
    } finally {
      setLoadingCategories(false);
    }
  });

  const loadItems = useEffectEvent(async (categoryId, reset = true) => {
    if (!categoryId) {
      setItems([]);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }

    const pageToFetch = reset ? 1 : currentPage + 1;
    const fetchLimit = 12; // 3 rows of 4 items or 4 rows of 3 items

    if (reset) {
      setLoadingItems(true);
      setCurrentPage(1);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const response = await fetchItemsByCategory(categoryId, pageToFetch, fetchLimit, searchQuery);
      const nextItems = response.data || [];
      const pagination = response.pagination || {};

      if (reset) {
        setItems(nextItems);
      } else {
        setItems((prev) => [...prev, ...nextItems]);
      }

      setCurrentPage(pageToFetch);
      setTotalPages(pagination.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      if (reset) {
        setItems([]);
      }
    } finally {
      if (reset) {
        setLoadingItems(false);
      } else {
        setIsFetchingMore(false);
      }
    }
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loadingItems || isFetchingMore || currentPage >= totalPages || !selectedCategory) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadItems(selectedCategory, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [loadingItems, isFetchingMore, currentPage, totalPages, selectedCategory]);

  const loadAddonsForItem = useEffectEvent(async (item, options = {}) => {
    const { useCache = true, openModal = true } = options;

    if (!item) {
      return [];
    }

    setLoadingAddons(true);

    try {
      if (useCache && addonCache[item.id]) {
        const cachedAddons = addonCache[item.id];

        setSelectedItemAddons(cachedAddons);

        if (openModal) {
          setProductModalOpen(true);
        }

        return cachedAddons;
      }

      const addons = await fetchItemAddons(item.id);

      setAddonCache((prev) => ({
        ...prev,
        [item.id]: addons,
      }));
      setSelectedItemAddons(addons);

      if (openModal) {
        setProductModalOpen(true);
      }

      return addons;
    } catch (error) {
      console.error("Failed to fetch item addons:", error);
      setSelectedItemAddons([]);
      if (openModal) {
        setProductModalOpen(false);
      }
      return [];
    } finally {
      setLoadingAddons(false);
    }
  });

  useMenuUpdates((payload) => {
    if (payload.entity === "category") {
      let nextSelectedCategory = selectedCategoryRef.current;

      setCategories((prevCategories) => {
        const nextState = applyCategoryChange({
          categories: prevCategories,
          selectedCategory: selectedCategoryRef.current,
          change: payload,
        });

        nextSelectedCategory = nextState.selectedCategory;
        return nextState.categories;
      });

      if (nextSelectedCategory !== selectedCategoryRef.current) {
        skipNextSelectedCategoryFetchRef.current = true;
        setSelectedCategory(nextSelectedCategory);
        setItems([]);
      }

      return;
    }

    if (payload.entity === "item") {
      const nextItemState = applyItemChange({
        items: itemsRef.current,
        selectedCategory: selectedCategoryRef.current,
        selectedItem: selectedItemRef.current,
        change: payload,
      });

      setItems(nextItemState.items);
      setSelectedItem(nextItemState.selectedItem);

      if (
        selectedItemRef.current &&
        Number(selectedItemRef.current.id) === Number(payload.entityId) &&
        (payload.action === "deleted" ||
          Number(payload.entityData?.is_active ?? 1) !== 1 ||
          Number(payload.entityData?.is_deleted ?? 0) !== 0)
      ) {
        setProductModalOpen(false);
        setSelectedItemAddons([]);
      }

      return;
    }

    if (payload.entity === "addon") {
      const nextAddonState = applyAddonChange({
        addonCache: addonCacheRef.current,
        selectedItem: selectedItemRef.current,
        selectedItemAddons: selectedItemAddonsRef.current,
        change: payload,
      });

      setAddonCache(nextAddonState.addonCache);
      setSelectedItemAddons(nextAddonState.selectedItemAddons);
    }
  });

  useEffect(() => {
    void loadCategories();

    const loadSettings = async () => {
      try {
        const settings = await fetchRestaurantSettings();
        setRestaurantSettings(settings);
      } catch (error) {
        console.error("Failed to fetch restaurant settings", error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const accessToken = customerAuthStorage.getAccessToken();

    if (!accessToken) {
      return;
    }

    let isCancelled = false;

    const loadCustomerProfile = async () => {
      try {
        const profile = await fetchCustomerProfile(accessToken);

        if (!isCancelled) {
          customerAuthStorage.updateCustomer(profile);
          setCustomer(profile);
        }
      } catch (_error) {
        customerAuthStorage.clearSession();
        if (!isCancelled) {
          setCustomer(null);
        }
      }
    };

    void loadCustomerProfile();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");

    if (!checkoutStatus) {
      return;
    }

    const clearCheckoutParams = () => {
      params.delete("checkout");
      params.delete("session_id");
      const nextSearch = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
      );
    };

    if (checkoutStatus === "cancelled") {
      setCheckoutResult({
        status: "cancelled",
        message: "Payment was cancelled. No online order was placed.",
        order: null,
      });
      // setCartOpen(true);
      clearCheckoutParams();
      return;
    }

    if (checkoutStatus !== "success" || !sessionId) {
      clearCheckoutParams();
      return;
    }

    const accessToken = customerAuthStorage.getAccessToken();

    if (!accessToken) {
      setCheckoutResult({
        status: "error",
        message: "Please sign in again to confirm your payment.",
        order: null,
      });
      clearCheckoutParams();
      return;
    }

    let isCancelled = false;

    const confirmCheckout = async () => {
      setCheckoutResult({
        status: "processing",
        message: "Verifying your Stripe payment...",
        order: null,
      });

      try {
        const result = await confirmCustomerCheckoutSession(sessionId, accessToken);

        if (isCancelled) {
          return;
        }

        const orderNumber = result?.order?.order_number;
        setCheckoutResult({
          status: "success",
          message: orderNumber
            ? `Payment successful. Order number: ${orderNumber}`
            : "Payment successful. Your order has been placed.",
          order: result?.order || null,
        });
        setCart([]);
        setOrdersRefreshKey((prev) => prev + 1);
      } catch (error) {
        if (!isCancelled) {
          setCheckoutResult({
            status: "error",
            message: error.message || "Payment succeeded, but confirmation failed.",
            order: null,
          });
        }
      } finally {
        if (!isCancelled) {
          clearCheckoutParams();
        }
      }
    };

    void confirmCheckout();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setItems([]);
      return;
    }

    if (skipNextSelectedCategoryFetchRef.current) {
      skipNextSelectedCategoryFetchRef.current = false;
      return;
    }

    void loadItems(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearchRef.current !== searchQuery) {
        debouncedSearchRef.current = searchQuery;
        
        if (searchQuery.trim() !== "") {
          if (window.location.pathname !== "/menu") {
            navigate("/menu");
          }
        }
        
        if (selectedCategory) {
          void loadItems(selectedCategory, true);
        }
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory, navigate]);

  useEffect(() => {
    const accessToken = customerAuthStorage.getAccessToken();

    if (!customer?.id || !accessToken) {
      previousNotificationCountRef.current = 0;
      hasLoadedNotificationSummaryRef.current = false;
      setNotificationSummary({
        unreadCount: 0,
        notifications: [],
      });
      return;
    }

    let isCancelled = false;

    const loadNotificationSummary = async () => {
      try {
        const summary = await fetchCustomerUnreadNotificationSummary(accessToken, 10);

        if (!isCancelled) {
          const nextUnreadCount = Number(summary?.unreadCount || 0);
          const previousUnreadCount = previousNotificationCountRef.current;

          if (
            hasLoadedNotificationSummaryRef.current &&
            nextUnreadCount > previousUnreadCount
          ) {
            startCustomerNotificationAlert();
          }

          previousNotificationCountRef.current = nextUnreadCount;
          hasLoadedNotificationSummaryRef.current = true;
          setNotificationSummary(summary);
        }
      } catch (_error) {
        if (!isCancelled) {
          previousNotificationCountRef.current = 0;
          hasLoadedNotificationSummaryRef.current = true;
          setNotificationSummary({
            unreadCount: 0,
            notifications: [],
          });
        }
      }
    };

    void loadNotificationSummary();

    return () => {
      isCancelled = true;
      stopCustomerNotificationAlert();
    };
  }, [customer?.id, notificationsRefreshKey]);

  useCustomerRealtimeUpdates({
    customer,
    onOrderUpdate: () => {
      setOrdersRefreshKey((prev) => prev + 1);
    },
    onNotificationUpdate: () => {
      setNotificationsRefreshKey((prev) => prev + 1);
    },
  });

  const buildCartItem = (item, selectedAddons = []) => {
    const addonIds = selectedAddons.map((addon) => addon.id).sort((a, b) => a - b);
    const cartKey = `${item.id}:${addonIds.join("-") || "base"}`;
    const addonTotal = selectedAddons.reduce(
      (sum, addon) => sum + Number(addon.addon_price || 0),
      0
    );

    return {
      ...item,
      cart_key: cartKey,
      selected_addons: selectedAddons,
      addon_total: addonTotal,
      qty: 1,
    };
  };

  const addConfiguredItemToCart = (item, selectedAddons = []) => {
    const cartItem = buildCartItem(item, selectedAddons);

    setCart((prev) => {
      const existing = prev.find((entry) => entry.cart_key === cartItem.cart_key);
      if (existing) {
        return prev.map((entry) =>
          entry.cart_key === cartItem.cart_key
            ? { ...entry, qty: entry.qty + 1 }
            : entry
        );
      }
      return [...prev, cartItem];
    });
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    setSelectedItem(null);
    setSelectedItemAddons([]);
    setLoadingAddons(false);
  };

  const handleProductConfirm = (selectedAddons) => {
    if (selectedItem) {
      if (selectedItem.cart_key) {
        const oldQty = selectedItem.qty || 1;
        setCart((prev) => {
          const filtered = prev.filter(c => c.cart_key !== selectedItem.cart_key);
          const addonIds = selectedAddons.map((addon) => addon.id).sort((a, b) => a - b);
          const newCartKey = `${selectedItem.id}:${addonIds.join("-") || "base"}`;
          const addonTotal = selectedAddons.reduce((sum, addon) => sum + Number(addon.addon_price || 0), 0);
          
          const existing = filtered.find(entry => entry.cart_key === newCartKey);
          if (existing) {
            return filtered.map(entry => 
              entry.cart_key === newCartKey 
                ? { ...entry, qty: entry.qty + oldQty }
                : entry
            );
          }
          
          return [...filtered, {
            ...selectedItem,
            cart_key: newCartKey,
            selected_addons: selectedAddons,
            addon_total: addonTotal,
            qty: oldQty
          }];
        });
      } else {
        addConfiguredItemToCart(selectedItem, selectedAddons);
      }
    }
    closeProductModal();
  };

  const openAddonsForItem = async (item) => {
    setSelectedItem(item);

    const addons = await loadAddonsForItem(item, {
      useCache: true,
      openModal: false,
    });

    setProductModalOpen(true);
  };

  const addToCart = (item) => {
    if (item.cart_key) {
      addConfiguredItemToCart(item, item.selected_addons || []);
      return;
    }

    addConfiguredItemToCart(item, []);
  };

  const removeFromCart = (itemId, cartKey = null) => {
    setCart((prev) => {
      const existing = cartKey
        ? prev.find((entry) => entry.cart_key === cartKey)
        : [...prev].reverse().find((entry) => entry.id === itemId);

      if (!existing) {
        return prev;
      }

      if (existing.qty > 1) {
        return prev.map((entry) =>
          entry.cart_key === existing.cart_key
            ? { ...entry, qty: entry.qty - 1 }
            : entry
        );
      }

      return prev.filter((entry) => entry.cart_key !== existing.cart_key);
    });
  };

  const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0);
  const shouldShowCheckoutResult = checkoutResult.status !== "idle";
  const checkoutResultIsBusy = checkoutResult.status === "processing";
  const checkoutResultIsSuccess = checkoutResult.status === "success";

  return (
    <div className="customer-shell">
      {shouldShowCheckoutResult ? (
        <div className="fixed inset-0 z-[500] grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-[min(460px,100%)] rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#1a1a2e_0%,#0f0c29_100%)] p-6 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
            <div
              className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black ${
                checkoutResult.status === "success"
                  ? "bg-green-500/20 text-green-200"
                  : checkoutResult.status === "processing"
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-red-500/20 text-red-200"
              }`}
            >
              {checkoutResult.status === "success"
                ? "OK"
                : checkoutResult.status === "processing"
                  ? "..."
                  : "!"}
            </div>
            <h2 className="mb-2 mt-5 text-2xl font-extrabold">
              {checkoutResult.status === "success"
                ? "Payment Successful"
                : checkoutResult.status === "processing"
                  ? "Confirming Payment"
                  : checkoutResult.status === "cancelled"
                    ? "Payment Cancelled"
                    : "Payment Not Completed"}
            </h2>
            <p className="mx-auto mb-5 max-w-[34ch] text-sm leading-6 text-white/65">
              {checkoutResult.message}
            </p>
            {checkoutResultIsBusy ? (
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {checkoutResultIsSuccess ? (
                  <button
                    type="button"
                    className="rounded-2xl border-0 bg-green-500 px-4 py-3 text-sm font-extrabold text-white"
                    onClick={() => {
                      setCheckoutResult({ status: "idle", message: "", order: null });
                      setDashboardTab("orders");
                      setDashboardModalOpen(true);
                    }}
                  >
                    View Order
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-extrabold text-white"
                  onClick={() => {
                    setCheckoutResult({ status: "idle", message: "", order: null });
                  }}
                >
                  {checkoutResultIsSuccess ? "Continue" : "Back to Cart"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      <Header
        cartCount={cartCount}
        customer={customer}
        notificationCount={notificationSummary.unreadCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCustomerClick={() => {
          if (!customer) {
            setAuthModalOpen(true);
          } else {
            setDashboardTab("profile");
            setDashboardModalOpen(true);
          }
        }}
        onDropdownClick={(tab) => {
          setDashboardTab(tab);
          setDashboardModalOpen(true);
        }}
        onLogoutClick={async () => {
          try {
            const accessToken = customerAuthStorage.getAccessToken();
            if (accessToken) await import("../../services/customerAuthApi").then(m => m.logoutCustomer(accessToken));
          } catch (e) {} finally {
            customerAuthStorage.clearSession();
            setCustomer(null);
          }
        }}
        onNotificationClick={() => {
          stopCustomerNotificationAlert();
          setNotificationDrawerOpen(true);
        }}
        onCartClick={() => {
          navigate("/cart");
        }}
      />
      <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-80px)]">
        <Outlet 
          context={{
            categories,
            selectedCategory,
            setSelectedCategory,
            loadingCategories,
            items,
            loadingItems,
            addToCart,
            openAddonsForItem,
            cart,
            removeFromCart,
            sentinelRef,
            isFetchingMore,
            customer,
            restaurantSettings,
            clearCart: () => setCart([]),
            setOrdersRefreshKey,
            openCustomerDashboard: (tab) => {
              setDashboardTab(tab);
              setDashboardModalOpen(true);
            }
          }}
        />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <NotificationDrawer
          open={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          notificationsRefreshKey={notificationsRefreshKey}
          onNotificationSummaryChange={setNotificationSummary}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={(customerData) => {
            setCustomer(customerData);
            import("../../services/customerProfileApi").then(async (m) => {
              try {
                const fresh = await m.fetchCustomerProfile(customerAuthStorage.getAccessToken());
                customerAuthStorage.updateCustomer(fresh);
                setCustomer(fresh);
              } catch(e) {}
            });
          }}
        />
      </Suspense>
      <Suspense fallback={null}>
        <CustomerDashboardModal
          open={dashboardModalOpen}
          onClose={() => setDashboardModalOpen(false)}
          customer={customer}
          onCustomerChange={setCustomer}
          initialTab={dashboardTab}
          ordersRefreshKey={ordersRefreshKey}
        />
      </Suspense>
      <Suspense fallback={null}>
        {productModalOpen && selectedItem ? (
          <ProductModal
            item={selectedItem}
            addons={selectedItemAddons}
            loading={loadingAddons}
            onClose={closeProductModal}
            onConfirm={handleProductConfirm}
            initialSelectedAddons={selectedItem.selected_addons || []}
          />
        ) : null}
      </Suspense>
    </div>
  );
}

export default Home;
