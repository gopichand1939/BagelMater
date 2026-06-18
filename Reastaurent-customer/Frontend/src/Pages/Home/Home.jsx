import { useEffect, useEffectEvent, useRef, useState, lazy, Suspense } from "react";
import { Header } from "../../components/common";
import { CategoryBar, ItemGrid, ItemCard } from "../../components/Menu";

const CartDrawer = lazy(() => import("../../components/Cart/CartDrawer"));
const AddonModal = lazy(() => import("../../components/Addons/AddonModal"));
const CustomerDrawer = lazy(() => import("../../components/customer/CustomerDrawer"));
import {
  fetchCategories,
  fetchItemAddons,
  fetchItemsByCategory,
  fetchTopProducts,
} from "../../services/menuApi";
import {
  applyCategoryChange,
  applyItemChange,
} from "../../realtime/applyMenuChange";
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

function Home() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [addonCache, setAddonCache] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemAddons, setSelectedItemAddons] = useState([]);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [customer, setCustomer] = useState(customerAuthStorage.getCustomer());
  const [customerDrawerTab, setCustomerDrawerTab] = useState("profile");
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

  const loadTopProducts = useEffectEvent(async () => {
    try {
      const data = await fetchTopProducts();
      setTopProducts(data);
    } catch (error) {
      console.error("Failed to fetch top products:", error);
      setTopProducts([]);
    }
  });

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
        : "all";

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
      const response = await fetchItemsByCategory(categoryId, pageToFetch, fetchLimit);
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
    const { useCache = false, openModal = true } = options;

    if (!item) {
      return [];
    }

    setLoadingAddons(true);

    try {
      if (useCache && addonCache[item.id]) {
        const cachedAddons = addonCache[item.id];

        setSelectedItemAddons(cachedAddons);

        if (openModal && cachedAddons.length > 0) {
          setAddonModalOpen(true);
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
        setAddonModalOpen(addons.length > 0);
      }

      return addons;
    } catch (error) {
      console.error("Failed to fetch item addons:", error);
      setSelectedItemAddons([]);
      if (openModal) {
        setAddonModalOpen(false);
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

    if (payload.entity === "top_products") {
      void loadTopProducts();
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
        setAddonModalOpen(false);
        setSelectedItemAddons([]);
      }

      return;
    }

    if (
      payload.entity === "addon" ||
      payload.entity === "addon_group" ||
      payload.entity === "addon_item" ||
      payload.entity === "addon_eligibility"
    ) {
      const affectedItemIds = [
        payload.itemId,
        payload.previousItemId,
        payload.entityData?.item_id,
      ]
        .filter(Boolean)
        .map((itemId) => Number(itemId));
      const isMasterAddonChange =
        affectedItemIds.length === 0 ||
        payload.entity === "addon_group" ||
        payload.entity === "addon_item";

      setAddonCache((prev) => {
        if (isMasterAddonChange) {
          return {};
        }

        const next = { ...prev };
        affectedItemIds.forEach((itemId) => {
          delete next[itemId];
        });
        return next;
      });

      if (
        selectedItemRef.current &&
        (isMasterAddonChange ||
          affectedItemIds.includes(Number(selectedItemRef.current.id)))
      ) {
        void loadAddonsForItem(selectedItemRef.current, {
          useCache: false,
          openModal: addonModalOpen,
        });
      }
    }
  });

  useEffect(() => {
    void loadCategories();
    void loadTopProducts();
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
      setCartOpen(true);
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

  const closeAddonModal = () => {
    setAddonModalOpen(false);
    setSelectedItem(null);
    setSelectedItemAddons([]);
    setLoadingAddons(false);
  };

  const handleAddonConfirm = (selectedAddons) => {
    if (selectedItem) {
      addConfiguredItemToCart(selectedItem, selectedAddons);
    }
    closeAddonModal();
  };

  const openAddonsForItem = async (item) => {
    if (item.cart_key) {
      return;
    }

    setSelectedItem(item);

    const addons = await loadAddonsForItem(item, {
      useCache: false,
      openModal: false,
    });

    if (addons.length > 0) {
      setAddonModalOpen(true);
    } else {
      closeAddonModal();
    }
  };

  const addToCart = async (item) => {
    if (item.cart_key) {
      addConfiguredItemToCart(item, item.selected_addons || []);
      return;
    }

    setSelectedItem(item);
    const addons = await loadAddonsForItem(item, {
      useCache: false,
      openModal: false,
    });

    if (addons.length > 0) {
      setAddonModalOpen(true);
      return;
    }

    closeAddonModal();
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
                      setCustomerDrawerTab("orders");
                      setCustomerDrawerOpen(true);
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
        onCustomerClick={() => {
          setCartOpen(false);
          setCustomerDrawerTab("profile");
          setCustomerDrawerOpen(true);
        }}
        onNotificationClick={() => {
          setCartOpen(false);
          setCustomerDrawerTab("notifications");
          stopCustomerNotificationAlert();
          setCustomerDrawerOpen(true);
        }}
        onCartClick={() => {
          setCustomerDrawerOpen(false);
          setCartOpen(true);
        }}
      />
      {/* Premium Top Products Showcase */}
      {topProducts && topProducts.length > 0 ? (
        <section className="px-4 py-6 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl text-amber-400">★</span>
            <h2 className="text-xl font-black text-white tracking-tight">Chef's Specialties</h2>
          </div>
          
          <div className="flex gap-5 overflow-x-auto pb-5 pt-1 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
            {topProducts.map((item) => {
              const cartQty = cart
                .filter((cartItem) => cartItem.id === item.id)
                .reduce((sum, cartItem) => sum + cartItem.qty, 0);

              return (
                <div key={item.id} className="w-[280px] shrink-0">
                  <ItemCard
                    item={item}
                    onAddToCart={addToCart}
                    onOpenAddons={openAddonsForItem}
                    cartQty={cartQty}
                    onRemoveFromCart={removeFromCart}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <CategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
        loading={loadingCategories}
      />
      <ItemGrid
        items={items}
        loading={loadingItems}
        onAddToCart={addToCart}
        onOpenAddons={openAddonsForItem}
        cart={cart}
        onRemoveFromCart={removeFromCart}
        sentinelRef={sentinelRef}
        isFetchingMore={isFetchingMore}
      />
      <Suspense fallback={null}>
        {cartOpen ? (
          <CartDrawer
            cart={cart}
            customer={customer}
            onClose={() => setCartOpen(false)}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onClearCart={() => setCart([])}
            onRequireSignIn={() => {
              setCartOpen(false);
              setCustomerDrawerTab("profile");
              setCustomerDrawerOpen(true);
            }}
            onOrderPlaced={() => {
              setOrdersRefreshKey((prev) => prev + 1);
              setCartOpen(false);
              setCustomerDrawerTab("orders");
              setCustomerDrawerOpen(true);
            }}
          />
        ) : null}
      </Suspense>
      <Suspense fallback={null}>
        <CustomerDrawer
          open={customerDrawerOpen}
          onClose={() => setCustomerDrawerOpen(false)}
          customer={customer}
          onCustomerChange={setCustomer}
          initialTab={customerDrawerTab}
          ordersRefreshKey={ordersRefreshKey}
          notificationsRefreshKey={notificationsRefreshKey}
          notificationSummary={notificationSummary}
          onNotificationSummaryChange={setNotificationSummary}
        />
      </Suspense>
      <Suspense fallback={null}>
        {addonModalOpen && selectedItem ? (
          <AddonModal
            item={selectedItem}
            addons={selectedItemAddons}
            loading={loadingAddons}
            onClose={closeAddonModal}
            onConfirm={handleAddonConfirm}
          />
        ) : null}
      </Suspense>
    </div>
  );
}

export default Home;
