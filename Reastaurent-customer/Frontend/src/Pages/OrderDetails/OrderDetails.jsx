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

import { Package, User, MapPin, CreditCard, Receipt, ChevronLeft } from "lucide-react";

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
    <main className="min-h-screen bg-cafe-bg px-4 pb-20 pt-28 text-white sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="customer-card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="m-0 font-sans text-xs font-bold uppercase tracking-[0.2em] text-cafe-gold">
              Order Details
            </p>
            <h1 className="m-0 mt-2 font-serif text-3xl font-bold sm:text-4xl">
              {order?.order_number || `Order #${id}`}
            </h1>
            <p className="m-0 mt-2 font-sans text-sm font-light text-white/60">
              Full order, address, item, and payment information.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-sans text-sm font-bold tracking-wider text-white transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </button>
        </header>

        {loading ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 text-white/70">
            Loading order details...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[22px] border border-red-500/25 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {order ? (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <InfoBlock title="Customer" icon={User}>
                <div>{order.customer_name}</div>
                <div>{order.customer_email}</div>
                <div>{order.customer_phone}</div>
              </InfoBlock>

              <InfoBlock title="Order Status" icon={Package}>
                <div className="capitalize">
                  Order: <span className="font-bold text-cafe-gold">{String(order.order_status || "-").replace(/_/g, " ")}</span>
                </div>
                <div className="capitalize">
                  Payment: {String(order.payment_status || "-").replace(/_/g, " ")}
                </div>
                <div className="capitalize">
                  Method: {String(order.payment_method || "-").replace(/_/g, " ")}
                </div>
                <div>Placed: {formatDateTime(order.created_at)}</div>
              </InfoBlock>

              <InfoBlock title="Delivery Address" icon={MapPin}>
                {addressLines(order.delivery_address).length > 0 ? (
                  addressLines(order.delivery_address).map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))
                ) : (
                  <div>-</div>
                )}
              </InfoBlock>
            </div>

            <InfoBlock title="Order Items" icon={Receipt}>
              {(order.items || []).map((item) => (
                <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <div className="font-serif text-lg font-bold text-white">{item.item_name}</div>
                      <div className="mt-1 font-sans text-xs uppercase tracking-wider text-white/50">
                        Qty {item.quantity} × {formatCurrency(item.final_unit_price, order.currency_code)}
                      </div>
                    </div>
                    <div className="font-serif text-lg font-bold text-cafe-gold">
                      {formatCurrency(item.line_total, order.currency_code)}
                    </div>
                  </div>
                  {Array.isArray(item.selected_addons) && item.selected_addons.length > 0 ? (
                    <div className="mt-2 font-sans text-xs font-light text-white/50">
                      <span className="font-semibold">Addons:</span> {item.selected_addons.map((addon) => addon.addon_name).join(", ")}
                    </div>
                  ) : null}
                  {item.item_notes ? (
                    <div className="mt-2 font-sans text-xs font-light text-white/50">
                      <span className="font-semibold">Note:</span> {item.item_notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </InfoBlock>

            <InfoBlock title="Payment Details">
              {(order.payments || []).length === 0 ? (
                <div>No payment record found for this order.</div>
              ) : (
                order.payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="font-extrabold capitalize text-white">
                        {String(payment.status || "-").replace(/_/g, " ")}
                      </div>
                      <div className="font-extrabold text-white">
                        {formatCurrency(payment.amount, payment.currency_code)}
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-white/55">
                      <div>Gateway: {payment.gateway || "-"}</div>
                      <div>RRN: {payment.rrn || "-"}</div>
                      <div>Transaction: {payment.transaction_id || "-"}</div>
                      <div>Payment ID: {payment.provider_payment_id || "-"}</div>
                      <div>Charge ID: {payment.provider_charge_id || "-"}</div>
                      <div>Balance Transaction: {payment.provider_balance_transaction_id || "-"}</div>
                      <div>Amount Paise: {payment.amount_in_paise ?? "-"}</div>
                      <div>Success Flag: {Number(payment.is_payment_success) === 1 ? "Yes" : "No"}</div>
                      <div>Paid at: {formatDateTime(payment.paid_at)}</div>
                      {payment.failure_message ? (
                        <div className="text-red-200">Failure: {payment.failure_message}</div>
                      ) : null}
                    </div>
                    <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-white">
                        Metadata
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/55">
                        {formatJson(payment.metadata)}
                      </pre>
                    </details>
                    <details className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-white">
                        Raw Event
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/55">
                        {formatJson(payment.raw_event)}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </InfoBlock>

            <InfoBlock title="Bill Summary" icon={Receipt}>
              <div className="flex justify-between gap-3 font-sans text-sm">
                <span className="text-white/70">Subtotal</span>
                <span className="font-medium text-white">{formatCurrency(order.subtotal_amount, order.currency_code)}</span>
              </div>
              <div className="flex justify-between gap-3 font-sans text-sm">
                <span className="text-white/70">Discount</span>
                <span className="font-medium text-green-400">{formatCurrency(order.discount_amount, order.currency_code)}</span>
              </div>
              <div className="flex justify-between gap-3 font-sans text-sm">
                <span className="text-white/70">Addons</span>
                <span className="font-medium text-white">{formatCurrency(order.addon_amount, order.currency_code)}</span>
              </div>
              <div className="flex justify-between gap-3 font-sans text-sm">
                <span className="text-white/70">Tax</span>
                <span className="font-medium text-white">{formatCurrency(order.tax_amount, order.currency_code)}</span>
              </div>
              <div className="flex justify-between gap-3 font-sans text-sm">
                <span className="text-white/70">Delivery</span>
                <span className="font-medium text-white">{formatCurrency(order.delivery_fee, order.currency_code)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t border-white/10 pt-4 font-serif text-2xl font-bold text-cafe-gold">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount, order.currency_code)}</span>
              </div>
            </InfoBlock>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default OrderDetails;
