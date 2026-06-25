import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, User, ShoppingBag, Settings, LogOut, Info } from "lucide-react";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import { changeCustomerPassword, logoutCustomer } from "../../services/customerAuthApi";
import { updateCustomerProfile } from "../../services/customerProfileApi";
import { fetchMyOrders } from "../../services/orderApi";
import { AnimatePresence, motion } from "framer-motion";

const formatDateTime = (value) => {
  if (!value) return "-";
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
  if (!message) return null;
  const isSuccess = tone === "success";
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm mb-6 ${
        isSuccess
          ? "border border-green-500/25 bg-green-500/15 text-green-200"
          : "border border-red-500/25 bg-red-500/10 text-red-200"
      }`}
    >
      {message}
    </div>
  );
}

export default function CustomerDashboardModal({
  open,
  onClose,
  customer,
  onCustomerChange,
  initialTab = "profile",
  ordersRefreshKey = 0,
}) {
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

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || "profile");
      setMessage("");
      setErrorMessage("");
    }
  }, [open, initialTab]);

  useEffect(() => {
    setProfileForm({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
    });
  }, [customer]);

  useEffect(() => {
    if (activeTab !== "orders" || !open) return;

    let cancelled = false;
    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const accessToken = customerAuthStorage.getAccessToken();
        const result = await fetchMyOrders(accessToken, { page: 1, limit: 20 });
        if (!cancelled) setOrders(result.data || []);
      } catch (error) {
        if (!cancelled) {
          setOrders([]);
          setOrdersError(error.message);
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    };
    void loadOrders();
    return () => { cancelled = true; };
  }, [activeTab, ordersRefreshKey, open]);

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
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const signOut = async () => {
    try {
      const accessToken = customerAuthStorage.getAccessToken();
      if (accessToken) await logoutCustomer(accessToken);
    } catch (_error) {
    } finally {
      customerAuthStorage.clearSession();
      onCustomerChange(null);
      onClose();
    }
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "orders", label: "My Orders", icon: ShoppingBag },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "support", label: "Support", icon: Info },
  ];

  return (
    <AnimatePresence>
      {open && customer && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md"
          />
          <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 md:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-4xl max-h-[90vh] bg-[#110e0d] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col md:flex-row"
            >
              {/* Sidebar */}
              <div className="md:w-64 bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cafe-gold text-lg font-bold text-[#110e0d]">
                    {(customer.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-serif font-bold text-white">
                      {customer.name}
                    </h3>
                    <p className="truncate text-xs text-white/50">{customer.email}</p>
                  </div>
                </div>

                <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMessage("");
                          setErrorMessage("");
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-sans text-sm font-semibold ${
                          isActive
                            ? "bg-cafe-gold/10 text-cafe-gold"
                            : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto hidden md:block pt-6 border-t border-white/5">
                  <button
                    onClick={signOut}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-sans text-sm font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col max-h-[calc(90vh-140px)] md:max-h-full">
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                  <h2 className="text-xl font-serif font-bold text-white capitalize">
                    {activeTab.replace("_", " ")}
                  </h2>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <Notice tone="success" message={message} />
                  <Notice tone="error" message={errorMessage} />

                  {/* Profile Tab */}
                  {activeTab === "profile" && (
                    <form onSubmit={saveProfile} className="max-w-md space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Full Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cafe-gold/50 outline-none transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Email Address</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cafe-gold/50 outline-none transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cafe-gold/50 outline-none transition-colors"
                          required
                        />
                      </div>
                      <button type="submit" disabled={savingProfile} className="mt-4 px-6 py-3 bg-white text-[#110e0d] font-bold rounded-xl hover:bg-cafe-gold transition-colors">
                        {savingProfile ? "Saving..." : "Save Changes"}
                      </button>
                    </form>
                  )}

                  {/* Orders Tab */}
                  {activeTab === "orders" && (
                    <div className="space-y-4">
                      {ordersError && <div className="text-red-400 text-sm">{ordersError}</div>}
                      {ordersLoading && <div className="text-white/70 text-sm">Loading your orders...</div>}
                      {!ordersLoading && orders.length === 0 && (
                        <div className="text-center py-12 rounded-2xl border border-white/5 bg-white/[0.02]">
                          <ShoppingBag className="mx-auto h-12 w-12 text-white/20 mb-4" />
                          <h3 className="text-white font-serif text-lg mb-2">No orders yet</h3>
                          <p className="text-white/50 text-sm">When you place an order, it will appear here.</p>
                        </div>
                      )}
                      {!ordersLoading && orders.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-cafe-gold/30 transition-colors">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-bold text-white">Order {order.order_number}</span>
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                order.order_status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                                order.order_status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                'bg-cafe-gold/10 text-cafe-gold'
                              }`}>
                                {String(order.order_status).replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="text-sm text-white/50 mb-1">{formatDateTime(order.created_at)}</div>
                            <div className="text-sm font-bold text-white">Rs {Number(order.total_amount || 0).toFixed(2)}</div>
                          </div>
                          <div className="flex flex-wrap md:flex-nowrap gap-2 shrink-0">
                            {order.order_status === 'delivered' && (
                              <a 
                                href="https://www.google.com/maps/place/Bagel+Master/@51.530737,-0.076772,15z/data=!4m8!3m7!1s0x48761cbbff5bf991:0xbaf6506c9264106b!8m2!3d51.5307372!4d-0.0767717!9m1!1b1!16s%2Fg%2F11c5_0sllr?hl=en-US&entry=ttu&g_ep=EgoyMDI2MDYyMi4wIKXMDSoASAFQAw%3D%3D" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-4 py-2.5 rounded-xl bg-cafe-gold text-[#110e0d] text-sm font-bold hover:bg-white transition-colors text-center"
                              >
                                Share Feedback
                              </a>
                            )}
                            <button onClick={() => { onClose(); navigate(`/orders/${order.id}`); }} className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-sm font-bold hover:bg-white hover:text-[#110e0d] transition-colors">
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Settings Tab */}
                  {activeTab === "settings" && (
                    <div className="max-w-md">
                      <h3 className="text-lg font-serif font-bold text-white mb-6">Change Password</h3>
                      <form onSubmit={submitPasswordChange} className="space-y-4">
                        <div>
                          <input
                            type="password"
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                            placeholder="Current password"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cafe-gold/50 outline-none transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="password"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                            placeholder="New password"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cafe-gold/50 outline-none transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="password"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                            placeholder="Confirm new password"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cafe-gold/50 outline-none transition-colors"
                            required
                          />
                        </div>
                        <button type="submit" disabled={savingPassword} className="mt-4 px-6 py-3 bg-white/10 text-white border border-white/10 font-bold rounded-xl hover:bg-white hover:text-[#110e0d] transition-colors">
                          {savingPassword ? "Updating..." : "Update Password"}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Support Tab */}
                  {activeTab === "support" && (
                    <div className="space-y-6 max-w-lg">
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-lg font-serif font-bold text-white mb-2">Need help with an order?</h3>
                        <p className="text-white/60 text-sm mb-4">Our support team is available from 8 AM to 10 PM daily.</p>
                        <p className="text-cafe-gold font-bold">+44 20 7946 0958</p>
                        <p className="text-cafe-gold font-bold">support@bagelcafe.com</p>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-lg font-serif font-bold text-white mb-2">Address Management</h3>
                        <p className="text-white/60 text-sm">
                          Our address management system is currently being integrated. For now, you can add specific delivery notes directly during the checkout process.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
