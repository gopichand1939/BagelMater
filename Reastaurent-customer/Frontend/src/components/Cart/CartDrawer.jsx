import { useEffect, useState } from "react";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import { getImageUrl } from "../../Utils/imageUrl";
import { placeCustomerOrder } from "../../services/orderApi";
import {
  createCustomerCheckoutSession,
} from "../../services/paymentApi";
import {
  STRIPE_MIN_INR_AMOUNT,
  STRIPE_PUBLISHABLE_KEY,
} from "../../Utils/Constant";
import { getStripeClient } from "../../Utils/stripeClient";

function CartDrawer({
  cart,
  customer,
  onClose,
  onAdd,
  onRemove,
  onClearCart,
  onRequireSignIn,
  onOrderPlaced,
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
    if (paymentMethod === "stripe" && isStripeOptionDisabled) {
      setPaymentMethod("cash_on_delivery");
    }
  }, [isStripeOptionDisabled, paymentMethod]);

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

    if (
      !deliveryForm.line1.trim() ||
      !deliveryForm.city.trim() ||
      !deliveryForm.pincode.trim()
    ) {
      setErrorMessage(
        "Please add address line 1, city, and pincode before placing the order."
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
          addons: (item.selected_addons || []).map((addon) => ({
            addonOptionId: addon.addonOptionId ?? addon.id,
          })),
          item_notes: item.item_notes || "",
        })),
        delivery_address: {
          recipient_name: deliveryForm.recipient_name.trim(),
          phone: deliveryForm.phone.trim(),
          line1: deliveryForm.line1.trim(),
          line2: deliveryForm.line2.trim(),
          landmark: deliveryForm.landmark.trim(),
          city: deliveryForm.city.trim(),
          state: deliveryForm.state.trim(),
          pincode: deliveryForm.pincode.trim(),
        },
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
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-customer-overlay-in"
      />

      <div className="fixed inset-y-0 right-0 z-[201] flex w-[min(420px,92vw)] flex-col border-l border-white/10 bg-[linear-gradient(180deg,#1a1a2e_0%,#0f0c29_100%)] animate-customer-drawer-in">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="m-0 text-xl font-bold text-white">Your Cart</h2>
            <p className="mt-1 text-[13px] text-white/40">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border-0 bg-white/10 text-lg text-white transition hover:bg-white/15"
          >
            x
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-white/10 font-extrabold text-white">
                Cart
              </div>
              <p className="m-0 text-[15px] text-white/40">
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
                    className="flex items-start gap-3.5 rounded-[14px] border border-white/10 bg-white/[0.04] p-[14px]"
                  >
                    {getImageUrl(item, "item_image") ? (
                      <img
                        src={getImageUrl(item, "item_image")}
                        alt={item.item_name}
                        className="h-14 w-14 flex-shrink-0 rounded-[10px] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-2xl font-extrabold text-white">
                        F
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="m-0 truncate text-sm font-semibold text-white">
                        {item.item_name}
                      </h4>
                      {item.selected_addons?.length > 0 ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                          {item.selected_addons
                            .map((addon) => addon.addon_name)
                            .join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-sm font-bold text-amber-500">
                        Rs {linePrice.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center overflow-hidden rounded-[10px] bg-white/10">
                      <button
                        onClick={() => onRemove(item.id, item.cart_key)}
                        className="border-0 bg-transparent px-2.5 py-1.5 text-[15px] font-bold text-white"
                      >
                        -
                      </button>
                      <span className="min-w-[18px] text-center text-[13px] font-bold text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onAdd(item)}
                        className="border-0 bg-transparent px-2.5 py-1.5 text-[15px] font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="m-0 text-base text-white">Delivery Details</h3>
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
                  placeholder="Address line 1"
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
                    placeholder="City"
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
                  placeholder="Pincode"
                  className="customer-input"
                />
                <textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Order notes"
                  rows={3}
                  className="customer-textarea"
                />
              </div>

              <div className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="m-0 text-base text-white">Payment Method</h3>
                <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash_on_delivery"
                    checked={paymentMethod === "cash_on_delivery"}
                    onChange={() => setPaymentMethod("cash_on_delivery")}
                  />
                  <span>Cash on delivery</span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white ${
                    isStripeOptionDisabled ? "cursor-not-allowed opacity-55" : ""
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
          <div className="border-t border-white/10 bg-white/[0.02] px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[15px] text-white/60">Total</span>
              <span className="text-[22px] font-extrabold text-white">
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
              className="w-full rounded-[14px] border-0 bg-gradient-to-br from-amber-500 to-red-500 px-4 py-[14px] text-[15px] font-bold tracking-[0.5px] text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {customer
                ? submitting
                  ? paymentMethod === "stripe"
                    ? stripeLoading
                      ? "Opening Stripe..."
                      : "Creating Checkout..."
                    : "Placing Order..."
                  : paymentMethod === "stripe"
                    ? "Pay on Stripe"
                    : "Place Order"
                : "Sign In To Order"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default CartDrawer;
