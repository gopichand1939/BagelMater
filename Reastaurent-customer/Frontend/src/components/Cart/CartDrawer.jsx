import { useEffect, useState } from "react";
import { X, ShoppingBag, Plus, Minus } from "lucide-react";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import { getImageUrl } from "../../Utils/imageUrl";
import { placeCustomerOrder } from "../../services/orderApi";
import { createCustomerCheckoutSession } from "../../services/paymentApi";
import {
  STRIPE_MIN_INR_AMOUNT,
  STRIPE_PUBLISHABLE_KEY,
} from "../../Utils/Constant";
import { getStripeClient } from "../../Utils/stripeClient";
import { isRestaurantOpen } from "../../Utils/restaurantLogic";

function CartDrawer({
  cart,
  customer,
  onClose,
  onAdd,
  onRemove,
  onClearCart,
  onRequireSignIn,
  onOrderPlaced,
  restaurantSettings,
}) {
  const [deliveryForm, setDeliveryForm] = useState({
    recipient_name: customer?.name || "",
    phone: customer?.phone || "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [orderType, setOrderType] = useState("collection");
  const [scheduledTime, setScheduledTime] = useState("");

  const cafeOpen = isRestaurantOpen(restaurantSettings);

  useEffect(() => {
    setDeliveryForm((prev) => ({
      ...prev,
      recipient_name: customer?.name || prev.recipient_name || "",
      phone: customer?.phone || prev.phone || "",
    }));
  }, [customer]);

  const total = cart.reduce((sum, item) => {
    const price =
      item.discount_price && item.discount_price < item.price
        ? item.discount_price
        : item.price;

    return sum + (Number(price) + Number(item.addon_total || 0)) * item.qty;
  }, 0);

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const isStripeAmountAllowed = total >= STRIPE_MIN_INR_AMOUNT;
  const isStripeOptionDisabled =
    !STRIPE_PUBLISHABLE_KEY || !isStripeAmountAllowed;

  useEffect(() => {
    if (orderType === "delivery" && paymentMethod === "cash_on_delivery") {
      setPaymentMethod("stripe"); // Force stripe for delivery
    } else if (paymentMethod === "stripe" && isStripeOptionDisabled) {
      setPaymentMethod("cash_on_delivery");
    }
  }, [isStripeOptionDisabled, paymentMethod, orderType]);

  const handleFieldChange = (field, value) => {
    setDeliveryForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handlePlaceOrder = async () => {
    if (!customer) {
      setErrorMessage("Please sign in before placing your order.");
      setSuccessMessage("");
      onRequireSignIn?.();
      return;
    }

    if (!cafeOpen && !scheduledTime) {
      setErrorMessage("The cafe is currently closed. Please select a future time slot for a scheduled order.");
      setSuccessMessage("");
      return;
    }

    if (
      orderType === "delivery" &&
      (!deliveryForm.line1.trim() ||
        !deliveryForm.city.trim() ||
        !deliveryForm.pincode.trim())
    ) {
      setErrorMessage(
        "Please add address line 1, city, and pincode for delivery."
      );
      setSuccessMessage("");
      return;
    }

    if (paymentMethod === "stripe" && !isStripeAmountAllowed) {
      setErrorMessage(
        `Online payment minimum is Rs ${STRIPE_MIN_INR_AMOUNT.toFixed(
          2
        )}. Please add more items or choose cash on delivery.`
      );
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    resetMessages();

    try {
      const accessToken = customerAuthStorage.getAccessToken();

      if (!accessToken) {
        throw new Error("Please sign in again before placing your order.");
      }

      const checkoutPayload = {
        items: cart.map((item) => ({
          item_id: item.id,
          quantity: item.qty,
          selected_addons: item.selected_addons || [],
          item_notes: item.item_notes || "",
        })),
        order_type: orderType,
        scheduled_time: scheduledTime || null,
        delivery_address: orderType === "delivery" ? {
          recipient_name: deliveryForm.recipient_name.trim(),
          phone: deliveryForm.phone.trim(),
          line1: deliveryForm.line1.trim(),
          line2: deliveryForm.line2.trim(),
          landmark: deliveryForm.landmark.trim(),
          city: deliveryForm.city.trim(),
          state: deliveryForm.state.trim(),
          pincode: deliveryForm.pincode.trim(),
        } : null,
        order_notes: orderNotes.trim(),
      };

      if (paymentMethod === "stripe") {
        setStripeLoading(true);
        const successUrl = `${window.location.origin}${window.location.pathname}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}${window.location.pathname}?checkout=cancelled`;
        const checkoutSession = await createCustomerCheckoutSession(
          {
            checkoutPayload,
            successUrl,
            cancelUrl,
          },
          accessToken
        );

        if (checkoutSession.url) {
          window.location.assign(checkoutSession.url);
          return;
        }

        const stripe = await getStripeClient();
        const redirectResult = await stripe.redirectToCheckout({
          sessionId: checkoutSession.sessionId,
        });

        if (redirectResult.error) {
          throw new Error(redirectResult.error.message || "Unable to open Stripe checkout");
        }

        return;
      }

      const order = await placeCustomerOrder(
        {
          ...checkoutPayload,
          payment_method: paymentMethod,
        },
        accessToken
      );

      setSuccessMessage(
        paymentMethod === "stripe"
          ? `Payment successful. Order number: ${order.order_number}`
          : `Order placed successfully. Order number: ${order.order_number}`
      );
      onClearCart?.();
      onOrderPlaced?.(order);
      setOrderNotes("");
      setPaymentMethod("cash_on_delivery");
      setDeliveryForm({
        recipient_name: customer?.name || "",
        phone: customer?.phone || "",
        line1: "",
        line2: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
      setStripeLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="customer-drawer-overlay"
      />

      <div className="customer-drawer-panel flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <h2 className="m-0 font-serif text-2xl font-bold text-white">Your Cart</h2>
            <p className="mt-1 font-sans text-[13px] font-medium text-cafe-gold">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-white/20">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="m-0 font-sans text-sm font-medium text-white/40">
                Your cart is empty
              </p>
            </div>
          ) : (
            <>
              {cart.map((item) => {
                const price =
                  item.discount_price && item.discount_price < item.price
                    ? item.discount_price
                    : item.price;
                const linePrice =
                  (Number(price) + Number(item.addon_total || 0)) * item.qty;

                return (
                  <div
                    key={item.cart_key || item.id}
                    className="customer-card flex items-start gap-4 p-4"
                  >
                    {getImageUrl(item, "item_image") ? (
                      <img
                        src={getImageUrl(item, "item_image")}
                        alt={item.item_name}
                        className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
                        ☕
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="m-0 truncate font-serif text-base font-bold text-white">
                        {item.item_name}
                      </h4>
                      {item.selected_addons?.length > 0 ? (
                        <p className="mt-1 font-sans text-xs leading-relaxed text-white/50">
                          {item.selected_addons
                            .map((addon) => addon.addon_name)
                            .join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-2 font-serif text-[15px] font-bold text-cafe-gold">
                        Rs {linePrice.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center overflow-hidden rounded-full border border-cafe-gold/30 bg-[#1c1917]">
                      <button
                        onClick={() => onRemove(item.id, item.cart_key)}
                        className="flex h-8 w-8 items-center justify-center border-0 bg-transparent text-cafe-gold hover:bg-white/5"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[20px] text-center font-sans text-[13px] font-bold text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onAdd(item)}
                        className="flex h-8 w-8 items-center justify-center border-0 bg-transparent text-cafe-gold hover:bg-white/5"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="customer-card mt-2 grid gap-3 p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-white">Order Details</h3>
                
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 mb-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("collection")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                      orderType === "collection" ? "bg-cafe-gold text-[#110e0d]" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Collection
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("delivery")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                      orderType === "delivery" ? "bg-cafe-gold text-[#110e0d]" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Delivery
                  </button>
                </div>

                {!cafeOpen && (
                  <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200 mb-2">
                    The cafe is currently closed for immediate orders. You can schedule your order for later.
                  </div>
                )}

                <label className="text-sm font-semibold text-white/80 mt-2 block">
                  Scheduled Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="customer-input"
                />

                {orderType === "delivery" ? (
                  <>
                    <label className="text-sm font-semibold text-white/80 mt-4 block">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.recipient_name}
                      onChange={(event) =>
                        handleFieldChange("recipient_name", event.target.value)
                      }
                      placeholder="Recipient name"
                      className="customer-input"
                    />
                    <input
                      type="tel"
                      value={deliveryForm.phone}
                      onChange={(event) =>
                        handleFieldChange("phone", event.target.value)
                      }
                      placeholder="Phone number"
                      className="customer-input"
                    />
                    <textarea
                      value={deliveryForm.line1}
                      onChange={(event) =>
                        handleFieldChange("line1", event.target.value)
                      }
                      placeholder="Address line 1 *"
                      rows={2}
                      className="customer-textarea min-h-[80px]"
                    />
                    <input
                      type="text"
                      value={deliveryForm.line2}
                      onChange={(event) =>
                        handleFieldChange("line2", event.target.value)
                      }
                      placeholder="Address line 2"
                      className="customer-input"
                    />
                    <input
                      type="text"
                      value={deliveryForm.landmark}
                      onChange={(event) =>
                        handleFieldChange("landmark", event.target.value)
                      }
                      placeholder="Landmark"
                      className="customer-input"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={deliveryForm.city}
                        onChange={(event) =>
                          handleFieldChange("city", event.target.value)
                        }
                        placeholder="City *"
                        className="customer-input"
                      />
                      <input
                        type="text"
                        value={deliveryForm.state}
                        onChange={(event) =>
                          handleFieldChange("state", event.target.value)
                        }
                        placeholder="State"
                        className="customer-input"
                      />
                    </div>
                    <input
                      type="text"
                      value={deliveryForm.pincode}
                      onChange={(event) =>
                        handleFieldChange("pincode", event.target.value)
                      }
                      placeholder="Pincode *"
                      className="customer-input"
                    />
                  </>
                ) : null}

                <label className="text-sm font-semibold text-white/80 mt-4 block">
                  Order Notes
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Order notes"
                  rows={3}
                  className="customer-textarea"
                />
              </div>

              <div className="customer-card grid gap-3 p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-white">Payment Method</h3>
                
                {orderType === "collection" ? (
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors hover:bg-white/10">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash_on_delivery"
                      checked={paymentMethod === "cash_on_delivery"}
                      onChange={() => setPaymentMethod("cash_on_delivery")}
                    />
                    <span>Pay at Collection (Cash/Card)</span>
                  </label>
                ) : null}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors hover:bg-white/10 ${
                    isStripeOptionDisabled ? "cursor-not-allowed opacity-50" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="stripe"
                    checked={paymentMethod === "stripe"}
                    disabled={isStripeOptionDisabled}
                    onChange={() => setPaymentMethod("stripe")}
                  />
                  <span>Pay online with card</span>
                </label>
                {!isStripeAmountAllowed ? (
                  <div className="rounded-[12px] border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    Online card payment is available from Rs{" "}
                    {STRIPE_MIN_INR_AMOUNT.toFixed(2)}. Use cash on delivery
                    for this order or add more items.
                  </div>
                ) : null}

                {paymentMethod === "stripe" ? (
                  <div className="rounded-[14px] border border-amber-400/25 bg-white/[0.04] p-4 text-xs leading-5 text-white/55">
                    You will be redirected to Stripe Checkout. Use test card
                    4242 4242 4242 4242 with any future expiry and any CVC.
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {cart.length > 0 ? (
          <div className="border-t border-white/5 bg-[#110e0d] pb-2 pt-5">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-sans text-sm uppercase tracking-wider text-white/60">Total Amount</span>
              <span className="font-serif text-[26px] font-bold text-cafe-gold">
                Rs {total.toFixed(2)}
              </span>
            </div>
            {errorMessage ? (
              <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-[14px] py-3 text-[13px] text-red-200">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div className="mb-3 rounded-xl border border-green-500/25 bg-green-500/15 px-[14px] py-3 text-[13px] text-green-200">
                {successMessage}
              </div>
            ) : null}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="customer-primary-button w-full"
            >
              {customer
                ? submitting
                  ? paymentMethod === "stripe"
                    ? stripeLoading
                      ? "Opening Stripe..."
                      : "Creating Checkout..."
                    : "Placing Order..."
                  : paymentMethod === "stripe"
                    ? "Pay Securely on Stripe"
                    : "Confirm Order"
                : "Sign In To Order"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default CartDrawer;
