import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import { fetchCustomerOrderDetails } from "../../services/orderApi";

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

const formatCurrency = (value, currencyCode = "INR") => {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    return `Rs ${amount.toFixed(2)}`;
  }
};

const addressLines = (address = {}) =>
  [
    address.recipient_name,
    address.phone,
    address.line1,
    address.line2,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const formatJson = (value) => {
  if (!value || Object.keys(value || {}).length === 0) {
    return "-";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return String(value);
  }
};

function InfoBlock({ title, children, icon: Icon }) {
  return (
    <section className="customer-card">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        {Icon && <Icon className="h-5 w-5 text-cafe-gold" />}
        <h2 className="m-0 font-serif text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3 font-sans text-sm font-light leading-relaxed text-white/70">
        {children}
      </div>
    </section>
  );
}

import { Package, User, MapPin, Receipt, ChevronLeft, Calendar, ArrowLeft } from "lucide-react";

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const accessToken = customerAuthStorage.getAccessToken();

        if (!accessToken) {
          throw new Error("Please sign in to view this order.");
        }

        const result = await fetchCustomerOrderDetails(id, accessToken);

        if (!cancelled) {
          setOrder(result);
        }
      } catch (error) {
        if (!cancelled) {
          setOrder(null);
          setErrorMessage(error.message || "Failed to fetch order details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-[#110e0d] px-4 pb-24 pt-32 text-white sm:px-6 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cafe-gold/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="mx-auto grid w-full max-w-5xl gap-8 relative z-10">
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/60 hover:text-cafe-gold transition-colors font-sans font-bold text-sm mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-cafe-gold mb-2">
              Order Receipt
            </p>
            <h1 className="font-serif text-4xl font-bold sm:text-5xl text-white">
              {order?.order_number || `Order #${id}`}
            </h1>
          </div>
          {order && (
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                order.order_status === "completed" ? "bg-green-500/20 text-green-400" :
                order.order_status === "cancelled" ? "bg-red-500/20 text-red-400" :
                "bg-amber-500/20 text-amber-400"
              }`}>
                {String(order.order_status || "Processing").replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-2 text-white/50 text-sm font-sans">
                <Calendar className="h-4 w-4" />
                {formatDateTime(order.created_at)}
              </div>
            </div>
          )}
        </header>

        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-white/50">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cafe-gold border-t-transparent mb-4" />
            <p>Fetching your order...</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-red-200">
            {errorMessage}
          </div>
        )}

        {order && (
          <div className="grid gap-8 lg:grid-cols-12">
            
            {/* Left Column: Order Items & Summary */}
            <div className="lg:col-span-8 space-y-8">
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Receipt className="h-6 w-6 text-cafe-gold" />
                  <h2 className="font-serif text-2xl font-bold text-white">Order Items</h2>
                </div>
                
                <div className="space-y-4">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row justify-between gap-4 py-4 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <div className="font-serif text-xl font-bold text-white mb-1">{item.item_name}</div>
                        {Array.isArray(item.selected_addons) && item.selected_addons.length > 0 && (
                          <div className="text-sm text-white/50 mb-2">
                            {item.selected_addons.map((addon) => addon.addon_name).join(", ")}
                          </div>
                        )}
                        {item.item_notes && (
                          <div className="text-sm text-cafe-gold/80 italic mb-2">
                            "{item.item_notes}"
                          </div>
                        )}
                        <div className="font-sans text-xs uppercase tracking-wider text-white/40">
                          Qty: {item.quantity} × {formatCurrency(item.final_unit_price, order.currency_code)}
                        </div>
                      </div>
                      <div className="font-serif text-xl font-bold text-cafe-gold sm:text-right">
                        {formatCurrency(item.line_total, order.currency_code)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Payment Details */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Receipt className="h-6 w-6 text-cafe-gold" />
                  <h2 className="font-serif text-2xl font-bold text-white">Payment Details</h2>
                </div>
                {(order.payments || []).length === 0 ? (
                  <p className="text-white/50">No payment records found.</p>
                ) : (
                  order.payments.map((payment) => (
                    <div key={payment.id} className="bg-black/30 rounded-2xl p-5 border border-white/5 mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-3">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                          Number(payment.is_payment_success) === 1 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {String(payment.status || "-").replace(/_/g, " ")}
                        </span>
                        <span className="font-bold text-white">{formatCurrency(payment.amount, payment.currency_code)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-white/60 mb-4">
                        <div><span className="text-white/40 block text-xs">Method</span>{payment.gateway || "-"}</div>
                        <div><span className="text-white/40 block text-xs">Transaction ID</span>{payment.transaction_id || "-"}</div>
                      </div>
                      {payment.failure_message && (
                        <div className="mt-2 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
                          Error: {payment.failure_message}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </section>
            </div>

            {/* Right Column: Customer & Bill Summary */}
            <div className="lg:col-span-4 space-y-8">
              {/* Bill Summary */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-bold text-white mb-6">Summary</h2>
                <div className="space-y-4 font-sans text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Subtotal</span>
                    <span className="text-white">{formatCurrency(order.subtotal_amount, order.currency_code)}</span>
                  </div>
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Discount</span>
                      <span className="text-green-400">-{formatCurrency(order.discount_amount, order.currency_code)}</span>
                    </div>
                  )}
                  {Number(order.addon_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Addons</span>
                      <span className="text-white">{formatCurrency(order.addon_amount, order.currency_code)}</span>
                    </div>
                  )}
                  {Number(order.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Tax</span>
                      <span className="text-white">{formatCurrency(order.tax_amount, order.currency_code)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/60">Delivery</span>
                    <span className="text-white">{formatCurrency(order.delivery_fee, order.currency_code)}</span>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold uppercase tracking-wider text-sm">Total</span>
                      <span className="font-serif text-3xl font-bold text-cafe-gold">
                        {formatCurrency(order.total_amount, order.currency_code)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Customer Info */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <User className="h-5 w-5 text-cafe-gold" />
                  <h2 className="font-serif text-xl font-bold text-white">Customer</h2>
                </div>
                <div className="space-y-2 text-sm text-white/70">
                  <p className="font-bold text-white">{order.customer_name}</p>
                  <p>{order.customer_email}</p>
                  <p>{order.customer_phone}</p>
                </div>
              </section>

              {/* Delivery Address */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="h-5 w-5 text-cafe-gold" />
                  <h2 className="font-serif text-xl font-bold text-white">Delivery</h2>
                </div>
                <div className="space-y-1 text-sm text-white/70 leading-relaxed">
                  {addressLines(order.delivery_address).length > 0 ? (
                    addressLines(order.delivery_address).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))
                  ) : (
                    <div className="italic text-white/40">Collection / No address provided</div>
                  )}
                </div>
              </section>
            </div>
            
          </div>
        )}
      </div>
    </main>
  );
}

export default OrderDetails;
