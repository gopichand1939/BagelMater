import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import {
  changeCustomerPassword,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
} from "../../services/customerAuthApi";
import {
  fetchCustomerProfile,
  updateCustomerProfile,
} from "../../services/customerProfileApi";
import { fetchMyOrders } from "../../services/orderApi";
import {
  fetchCustomerNotifications,
  fetchCustomerUnreadNotificationSummary,
  markAllCustomerNotificationsAsRead,
  markCustomerNotificationAsRead,
} from "../../services/customerNotificationApi";
import { stopCustomerNotificationAlert } from "../../Utils/notificationSound";

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (_error) {
    return value;
  }
};

function Notice({ tone = "success", message }) {
  if (!message) {
    return null;
  }

  const isSuccess = tone === "success";

  return (
    <div
      className={`rounded-xl px-[14px] py-3 text-[13px] ${
        isSuccess
          ? "border border-green-500/25 bg-green-500/15 text-green-200"
          : "border border-red-500/25 bg-red-500/10 text-red-200"
      }`}
    >
      {message}
    </div>
  );
}

function GuestView({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  const isLogin = mode === "login";

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const session = await loginCustomer(loginForm);
      customerAuthStorage.setSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        customer: session.customer,
      });
      onAuthenticated(session.customer);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const session = await registerCustomer(registerForm);
      customerAuthStorage.setSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        customer: session.customer,
      });
      onAuthenticated(session.customer);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="customer-card">
        <div className="mb-[18px] flex gap-2">
          {["login", "register"].map((tab) => {
            const active = tab === mode;

            return (
              <button
                key={tab}
                onClick={() => {
                  setMode(tab);
                  setErrorMessage("");
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 font-bold capitalize text-white transition ${
                  active
                    ? "border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-red-500/20"
                    : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <h3 className="m-0 text-[22px] font-bold text-white">
          {isLogin ? "Sign in to continue" : "Create your customer account"}
        </h3>
        <p className="mt-2 text-[13px] leading-6 text-white/60">
          Once signed in, this right-side panel will show your profile, orders,
          notifications, account, and address details.
        </p>

        <div className="mt-4">
          <Notice tone="error" message={errorMessage} />
        </div>

        <form
          onSubmit={isLogin ? handleLogin : handleRegister}
          className="mt-4 flex flex-col gap-3"
        >
          {isLogin ? (
            <>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Email address"
                className="customer-input"
                required
              />
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Password"
                className="customer-input"
                required
              />
            </>
          ) : (
            <>
              <input
                type="text"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Full name"
                className="customer-input"
                required
              />
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="Email address"
                className="customer-input"
                required
              />
              <input
                type="tel"
                value={registerForm.phone}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                placeholder="Mobile number"
                className="customer-input"
                required
              />
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Password"
                className="customer-input"
                required
              />
              <input
                type="password"
                value={registerForm.confirm_password}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    confirm_password: event.target.value,
                  }))
                }
                placeholder="Confirm password"
                className="customer-input"
                required
              />
            </>
          )}

          <button type="submit" disabled={submitting} className="customer-primary-button">
            {submitting
              ? isLogin
                ? "Signing in..."
                : "Creating account..."
              : isLogin
                ? "Sign In"
                : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SignedInView({
  customer,
  onCustomerChange,
  initialTab = "profile",
  ordersRefreshKey = 0,
  notificationsRefreshKey = 0,
  notificationSummary,
  onNotificationSummaryChange,
}) {
  const LIVE_ITEM_HIGHLIGHT_MS = 30000;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab || "profile");
  const [profileForm, setProfileForm] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState([]);
  const [highlightedNotificationIds, setHighlightedNotificationIds] = useState([]);

  const highlightOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    setHighlightedOrderIds((prev) => [...new Set([...prev, Number(orderId)])]);

    window.setTimeout(() => {
      setHighlightedOrderIds((prev) => prev.filter((value) => value !== Number(orderId)));
    }, LIVE_ITEM_HIGHLIGHT_MS);
  };

  const highlightNotification = (notificationId) => {
    if (!notificationId) {
      return;
    }

    setHighlightedNotificationIds((prev) => [
      ...new Set([...prev, Number(notificationId)]),
    ]);

    window.setTimeout(() => {
      setHighlightedNotificationIds((prev) =>
        prev.filter((value) => value !== Number(notificationId))
      );
    }, LIVE_ITEM_HIGHLIGHT_MS);
  };

  useEffect(() => {
    setActiveTab(initialTab || "profile");
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "notifications") {
      stopCustomerNotificationAlert();
    }
  }, [activeTab]);

  useEffect(() => {
    setProfileForm({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
    });
  }, [customer]);

  useEffect(() => {
    if (activeTab !== "orders") {
      return;
    }

    let cancelled = false;

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");

      try {
        const accessToken = customerAuthStorage.getAccessToken();
        const result = await fetchMyOrders(accessToken, {
          page: 1,
          limit: 20,
        });

        if (!cancelled) {
          setOrders(result.data || []);

          if (ordersRefreshKey > 0 && result.data?.[0]?.id) {
            highlightOrder(result.data[0].id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOrders([]);
          setOrdersError(error.message);
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [activeTab, ordersRefreshKey]);

  useEffect(() => {
    if (activeTab !== "notifications") {
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      setNotificationsLoading(true);
      setNotificationsError("");

      try {
        const accessToken = customerAuthStorage.getAccessToken();
        const result = await fetchCustomerNotifications(accessToken, {
          page: 1,
          limit: 30,
        });

        if (!cancelled) {
          setNotifications(result.data || []);

          if (notificationsRefreshKey > 0 && result.data?.[0]?.id) {
            highlightNotification(result.data[0].id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setNotifications([]);
          setNotificationsError(error.message);
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [activeTab, notificationsRefreshKey]);

  const tabs = useMemo(
    () => [
      { key: "profile", label: "My Profile" },
      { key: "orders", label: "My Orders" },
      {
        key: "notifications",
        label: `Notifications${notificationSummary?.unreadCount ? ` (${notificationSummary.unreadCount})` : ""}`,
      },
      { key: "account", label: "My Account" },
      { key: "address", label: "Address" },
    ],
    [notificationSummary?.unreadCount]
  );

  const refreshNotificationSummary = async () => {
    try {
      const accessToken = customerAuthStorage.getAccessToken();
      const summary = await fetchCustomerUnreadNotificationSummary(accessToken, 10);
      onNotificationSummaryChange(summary);
    } catch (_error) {
      onNotificationSummaryChange({
        unreadCount: 0,
        notifications: [],
      });
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setErrorMessage("");

    try {
      const updatedCustomer = await updateCustomerProfile(
        profileForm,
        customerAuthStorage.getAccessToken()
      );
      customerAuthStorage.updateCustomer(updatedCustomer);
      onCustomerChange(updatedCustomer);
      setMessage("Profile updated successfully");
      await refreshNotificationSummary();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setMessage("");
    setErrorMessage("");

    try {
      await changeCustomerPassword(
        passwordForm,
        customerAuthStorage.getAccessToken()
      );
      customerAuthStorage.clearSession();
      onCustomerChange(null);
      onNotificationSummaryChange({
        unreadCount: 0,
        notifications: [],
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const signOut = async () => {
    try {
      const accessToken = customerAuthStorage.getAccessToken();
      if (accessToken) {
        await logoutCustomer(accessToken);
      }
    } catch (_error) {
    } finally {
      customerAuthStorage.clearSession();
      onNotificationSummaryChange({
        unreadCount: 0,
        notifications: [],
      });
      onCustomerChange(null);
    }
  };

  const openNotification = async (notification) => {
    if (!notification) {
      return;
    }

    try {
      if (Number(notification.is_read) !== 1) {
        const accessToken = customerAuthStorage.getAccessToken();
        await markCustomerNotificationAsRead(notification.id, accessToken);
        setNotifications((prev) =>
          prev.map((entry) =>
            entry.id === notification.id
              ? {
                  ...entry,
                  is_read: 1,
                  read_at: new Date().toISOString(),
                }
              : entry
          )
        );
        setHighlightedNotificationIds((prev) =>
          prev.filter((value) => value !== Number(notification.id))
        );
        await refreshNotificationSummary();
      }

      const nextTab = String(notification.redirect_path || "notifications").trim();
      if (nextTab) {
        setActiveTab(nextTab);
      }
    } catch (error) {
      setNotificationsError(error.message);
    }
  };

  const markAllRead = async () => {
    setMarkingAllRead(true);
    setNotificationsError("");

    try {
      const accessToken = customerAuthStorage.getAccessToken();
      await markAllCustomerNotificationsAsRead(accessToken);
      setNotifications((prev) =>
        prev.map((entry) => ({
          ...entry,
          is_read: 1,
          read_at: entry.read_at || new Date().toISOString(),
        }))
      );
      await refreshNotificationSummary();
    } catch (error) {
      setNotificationsError(error.message);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const viewOrderDetails = async (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="customer-card">
        <div className="mb-[18px] flex items-center gap-[14px]">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 text-xl font-extrabold text-white">
            {(customer?.name || "C").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="m-0 truncate text-xl font-bold text-white">
              {customer?.name || "Customer"}
            </h3>
            <p className="mt-1.5 truncate text-[13px] text-white/55">
              {customer?.email}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="mb-[14px] w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-[14px] py-[11px] text-[13px] font-bold text-white transition hover:bg-white/[0.1]"
        >
          Logout
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setMessage("");
                  setErrorMessage("");
                }}
                className={`rounded-[14px] px-3 py-[11px] text-[13px] font-bold text-white transition ${
                  active
                    ? "border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-red-500/20"
                    : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <Notice tone="success" message={message} />
      <Notice tone="error" message={errorMessage} />

      {activeTab === "profile" ? (
        <form onSubmit={saveProfile} className="customer-card">
          <h4 className="m-0 text-lg font-semibold text-white">My Profile</h4>
          <p className="mt-2 text-[13px] text-white/55">
            These are your personal details from the customer account.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              value={profileForm.name}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
              className="customer-input"
              required
            />
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email address"
              className="customer-input"
              required
            />
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              placeholder="Mobile number"
              className="customer-input"
              required
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="customer-primary-button"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === "orders" ? (
        <div className="customer-card">
          <h4 className="m-0 text-lg font-semibold text-white">My Orders</h4>
          <p className="mt-2 text-[13px] text-white/55">
            These are the orders placed from this signed-in customer account.
          </p>

          {ordersError ? (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-[14px] py-3 text-[13px] text-red-200">
              {ordersError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2.5">
            {ordersLoading ? (
              <div className="rounded-[14px] bg-white/[0.03] px-[14px] py-[14px] text-[13px] text-white/70">
                Loading your orders...
              </div>
            ) : null}

            {!ordersLoading && orders.length === 0 ? (
              <div className="rounded-[14px] bg-white/[0.03] px-[14px] py-[14px] text-[13px] leading-6 text-white/70">
                No orders yet. Once you place an order from the cart, it will
                appear here for this customer account.
              </div>
            ) : null}

            {orders.map((order) => {
              const highlighted = highlightedOrderIds.includes(Number(order.id));

              return (
                <div
                  key={order.id}
                  className={`grid gap-2.5 rounded-[14px] px-[14px] py-[14px] transition-all duration-300 ${
                    highlighted
                      ? "border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-red-500/15 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]"
                      : "border border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {order.order_number}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {formatDateTime(order.created_at)}
                      </div>
                    </div>
                    <div className="rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-xs font-bold capitalize text-amber-200">
                      {String(order.order_status || "placed").replace(/_/g, " ")}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[13px] text-white/70">
                    <div>Items: {order.item_count}</div>
                    <div>Total: Rs {Number(order.total_amount || 0).toFixed(2)}</div>
                    <div className="capitalize">
                      Payment: {String(order.payment_status || "pending").replace(/_/g, " ")}
                    </div>
                    <div className="capitalize">
                      Method: {String(order.payment_method || "-").replace(/_/g, " ")}
                    </div>
                  </div>

                  {order.order_notes ? (
                    <div className="text-xs leading-6 text-white/65">
                      Note: {order.order_notes}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void viewOrderDetails(order.id)}
                    className="mt-1 w-fit rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/[0.1]"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <div className="customer-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="m-0 text-lg font-semibold text-white">Notifications</h4>
              <p className="mt-2 text-[13px] text-white/55">
                Customer actions and order updates for this signed-in account.
              </p>
            </div>
            <button
              onClick={markAllRead}
              disabled={markingAllRead}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-[14px] py-2.5 font-bold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {markingAllRead ? "Please wait..." : "Mark all read"}
            </button>
          </div>

          {notificationsError ? (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-[14px] py-3 text-[13px] text-red-200">
              {notificationsError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2.5">
            {notificationsLoading ? (
              <div className="rounded-[14px] bg-white/[0.03] px-[14px] py-[14px] text-[13px] text-white/70">
                Loading notifications...
              </div>
            ) : null}

            {!notificationsLoading && notifications.length === 0 ? (
              <div className="rounded-[14px] bg-white/[0.03] px-[14px] py-[14px] text-[13px] leading-6 text-white/70">
                No notifications yet. New customer actions like register, login,
                profile updates, and order updates will appear here.
              </div>
            ) : null}

            {notifications.map((notification) => {
              const highlighted = highlightedNotificationIds.includes(Number(notification.id));
              const isRead = Number(notification.is_read) === 1;

              return (
                <button
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                  className={`grid gap-2 rounded-[14px] px-[14px] py-[14px] text-left text-white transition-all duration-300 ${
                    highlighted
                      ? "border border-amber-400/35 bg-gradient-to-br from-amber-500/25 to-red-500/15 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.16)]"
                      : isRead
                        ? "border border-white/10 bg-white/[0.03]"
                        : "border border-amber-400/25 bg-gradient-to-br from-amber-500/15 to-red-500/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">{notification.title}</div>
                    <div
                      className={`text-xs font-bold ${
                        isRead ? "text-white/45" : "text-amber-200"
                      }`}
                    >
                      {isRead ? "Read" : "New"}
                    </div>
                  </div>
                  <div className="text-[13px] leading-6 text-white/70">
                    {notification.message}
                  </div>
                  <div className="text-xs text-white/45">
                    {formatDateTime(notification.created_at)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === "account" ? (
        <>
          <form onSubmit={submitPasswordChange} className="customer-card">
            <h4 className="m-0 text-lg font-semibold text-white">My Account</h4>
            <p className="mt-2 text-[13px] text-white/55">
              Update your password here. After password change, sign in again.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    current_password: event.target.value,
                  }))
                }
                placeholder="Current password"
                className="customer-input"
                required
              />
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    new_password: event.target.value,
                  }))
                }
                placeholder="New password"
                className="customer-input"
                required
              />
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirm_password: event.target.value,
                  }))
                }
                placeholder="Confirm new password"
                className="customer-input"
                required
              />
              <button
                type="submit"
                disabled={savingPassword}
                className="customer-primary-button"
              >
                {savingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>

          <div className="customer-card">
            <button onClick={signOut} className="customer-primary-button">
              Logout
            </button>
          </div>
        </>
      ) : null}

      {activeTab === "address" ? (
        <div className="customer-card">
          <h4 className="m-0 text-lg font-semibold text-white">Address</h4>
          <p className="mt-2 text-[13px] text-white/55">
            This section is kept ready for delivery address management.
          </p>
          <div className="mt-4 rounded-[14px] bg-white/[0.03] px-[14px] py-[14px] text-[13px] leading-6 text-white/70">
            We can add house number, street, city, pincode, landmark, and
            default address actions here next without changing this drawer
            structure.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomerDrawer({
  open,
  onClose,
  customer,
  onCustomerChange,
  initialTab = "profile",
  ordersRefreshKey = 0,
  notificationsRefreshKey = 0,
  notificationSummary,
  onNotificationSummaryChange,
}) {
  if (!open) {
    return null;
  }

  const handleAuthenticated = async (sessionCustomer) => {
    onCustomerChange(sessionCustomer);

    try {
      const accessToken = customerAuthStorage.getAccessToken();
      const [freshProfile, summary] = await Promise.all([
        fetchCustomerProfile(accessToken),
        fetchCustomerUnreadNotificationSummary(accessToken, 10),
      ]);
      customerAuthStorage.updateCustomer(freshProfile);
      onCustomerChange(freshProfile);
      onNotificationSummaryChange(summary);
    } catch (_error) {
      onCustomerChange(sessionCustomer);
    }
  };

  return (
    <>
      <div onClick={onClose} className="customer-drawer-overlay" />
      <div className="customer-drawer-panel flex flex-col !z-[221]">
        <div className="flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <h2 className="m-0 font-serif text-2xl font-bold text-white">
              {customer ? "Customer Panel" : "Customer Sign In"}
            </h2>
            <p className="mt-2 font-sans text-[13px] text-white/55">
              {customer
                ? "Your personal area for profile, notifications, account, orders, and address."
                : "Sign in once and this right-side panel becomes your personal profile area."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-[18px] sm:px-6">
          {customer ? (
            <SignedInView
              customer={customer}
              onCustomerChange={onCustomerChange}
              initialTab={initialTab}
              ordersRefreshKey={ordersRefreshKey}
              notificationsRefreshKey={notificationsRefreshKey}
              notificationSummary={notificationSummary}
              onNotificationSummaryChange={onNotificationSummaryChange}
            />
          ) : (
            <GuestView onAuthenticated={handleAuthenticated} />
          )}
        </div>
      </div>
    </>
  );
}

export default CustomerDrawer;
