import React, { useState, useEffect } from "react";
import { ShoppingBag, Plus, Minus, ArrowLeft, X, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
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

export default function CartPage() {
  const navigate = useNavigate();
  const {
    cart,
    addToCart: onAdd,
    removeFromCart: onRemove,
    clearCart: onClearCart,
    customer,
    restaurantSettings,
    openCustomerDrawer: onRequireSignIn,
    setOrdersRefreshKey,
    openAddonsForItem
  } = useOutletContext();

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

  const [editingItemKey, setEditingItemKey] = useState(null);
  const currentEditingItem = editingItemKey ? cart.find((c) => c.cart_key === editingItemKey) : null;

  useEffect(() => {
    if (editingItemKey && !currentEditingItem) {
      setEditingItemKey(null);
    }
  }, [currentEditingItem, editingItemKey]);

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
  const isStripeOptionDisabled = !STRIPE_PUBLISHABLE_KEY || !isStripeAmountAllowed;

  useEffect(() => {
    if (orderType === "delivery" && paymentMethod === "cash_on_delivery") {
      setPaymentMethod("stripe");
    } else if (paymentMethod === "stripe" && isStripeOptionDisabled) {
      setPaymentMethod("cash_on_delivery");
    }
  }, [isStripeOptionDisabled, paymentMethod, orderType]);

  const handleFieldChange = (field, value) => {
    setDeliveryForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handlePlaceOrder = async () => {
    if (!customer) {
      setErrorMessage("Please sign in before placing your order.");
      setSuccessMessage("");
      onRequireSignIn?.("profile");
      return;
    }

    if (!cafeOpen && !scheduledTime) {
      setErrorMessage("The cafe is currently closed. Please select a future time slot for a scheduled order.");
      setSuccessMessage("");
      return;
    }

    if (
      orderType === "delivery" &&
      (!deliveryForm.line1.trim() || !deliveryForm.city.trim() || !deliveryForm.pincode.trim())
    ) {
      setErrorMessage("Please add address line 1, city, and pincode for delivery.");
      setSuccessMessage("");
      return;
    }

    if (paymentMethod === "stripe" && !isStripeAmountAllowed) {
      setErrorMessage(
        `Online payment minimum is £ ${STRIPE_MIN_INR_AMOUNT.toFixed(2)}. Please add more items or choose cash on delivery.`
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
        const successUrl = `${window.location.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}/cart?checkout=cancelled`;
        const checkoutSession = await createCustomerCheckoutSession(
          { checkoutPayload, successUrl, cancelUrl },
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
        { ...checkoutPayload, payment_method: paymentMethod },
        accessToken
      );

      setSuccessMessage(`Order placed successfully. Order number: ${order.order_number}`);
      onClearCart?.();
      setOrdersRefreshKey?.((prev) => prev + 1);
      
      // Navigate to orders after successful COD placement
      setTimeout(() => {
        navigate("/");
        onRequireSignIn?.("orders");
      }, 2000);

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
      setStripeLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen pt-32 pb-24 bg-[#110e0d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Link to="/menu" className="inline-flex items-center gap-2 text-white/60 hover:text-cafe-gold transition-colors font-sans font-bold text-sm mb-8">
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
        
        <div className="mb-12">
          <h1 className=" text-2xl font-bold  text-white ">Your Cart</h1>
          <p className="mt-2 text-cafe-gold font-sans font-bold uppercase tracking-wider text-sm">
            {totalItems} {totalItems === 1 ? "Item" :"X Items"}
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-white/10 bg-white/5">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 text-white/20 mb-6">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h3 className="font-serif text-2xl text-white font-bold mb-2">Your cart is empty</h3>
            <p className="text-white/60 font-sans mb-8">Looks like you haven't added anything yet.</p>
            <Link to="/menu" className="customer-primary-button inline-flex">
              Explore Our Menu
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-6">
              {cart.map((item) => {
                const price = item.discount_price && item.discount_price < item.price ? item.discount_price : item.price;
                const linePrice = (Number(price) + Number(item.addon_total || 0)) * item.qty;

                return (
                  <div 
                    key={item.cart_key || item.id} 
                    onClick={() => setEditingItemKey(item.cart_key)}
                    className="flex gap-6 p-6 rounded-3xl border border-white/10 bg-white/5 items-center cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    {getImageUrl(item, "item_image") ? (
                      <img src={getImageUrl(item, "item_image")} alt={item.item_name} className="h-24 w-24 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/5 text-3xl">☕</div>
                    )}
                    <div className="flex-1">
                      <h4 className=" text-xl font-bold text-white mb-1">{item.item_name}</h4>
                      {item.selected_addons?.length > 0 && (
                        <p className="text-sm text-white/50 mb-2">
                          {item.selected_addons.map((addon) => addon.addon_name).join(", ")}
                        </p>
                      )}
                      <p className=" text-lg font-bold text-cafe-gold">£ {linePrice.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center rounded-full border border-cafe-gold/30 bg-[#1c1917]" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); onRemove(item.id, item.cart_key); }} className="p-3 text-cafe-gold hover:bg-white/5 rounded-l-full">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-white text-sm">{item.qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); onAdd(item); }} className="p-3 text-cafe-gold hover:bg-white/5 rounded-r-full">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h3 className="font-serif text-2xl font-bold text-white mb-6">Order Details</h3>
                
                <div className="flex gap-3 mb-6">
                  <button type="button" onClick={() => setOrderType("collection")} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${orderType === "collection" ? "bg-cafe-gold text-[#110e0d]" : "bg-black/50 text-white/60 hover:text-white"}`}>Collection</button>
                  <button type="button" onClick={() => setOrderType("delivery")} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${orderType === "delivery" ? "bg-cafe-gold text-[#110e0d]" : "bg-black/50 text-white/60 hover:text-white"}`}>Delivery</button>
                </div>

                {!cafeOpen && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 mb-6">
                    The cafe is currently closed for immediate orders. You can schedule your order for later.
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-sm font-bold text-white/80 mb-2 block">Scheduled Time (Optional)</label>
                    <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                  </div>

                  {orderType === "delivery" && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h4 className="font-bold text-white">Delivery Address</h4>
                      <input type="text" value={deliveryForm.recipient_name} onChange={(e) => handleFieldChange("recipient_name", e.target.value)} placeholder="Recipient name" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                      <input type="tel" value={deliveryForm.phone} onChange={(e) => handleFieldChange("phone", e.target.value)} placeholder="Phone number" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                      <input type="text" value={deliveryForm.line1} onChange={(e) => handleFieldChange("line1", e.target.value)} placeholder="Address line 1 *" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={deliveryForm.city} onChange={(e) => handleFieldChange("city", e.target.value)} placeholder="City *" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                        <input type="text" value={deliveryForm.pincode} onChange={(e) => handleFieldChange("pincode", e.target.value)} placeholder="Pincode *" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-white/80 mb-2 block">Order Notes</label>
                    <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special requests?" rows={3} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors" />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="font-serif text-2xl font-bold text-white mb-6">Payment</h3>
                  <div className="space-y-3 mb-8">
                    {orderType === "collection" && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-4 transition-colors hover:border-cafe-gold/50">
                        <input type="radio" name="payment_method" value="cash_on_delivery" checked={paymentMethod === "cash_on_delivery"} onChange={() => setPaymentMethod("cash_on_delivery")} className="text-cafe-gold focus:ring-cafe-gold" />
                        <span className="font-bold text-white">Pay at Collection</span>
                      </label>
                    )}
                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-4 transition-colors ${isStripeOptionDisabled ? 'opacity-50' : 'hover:border-cafe-gold/50'}`}>
                      <input type="radio" name="payment_method" value="stripe" checked={paymentMethod === "stripe"} disabled={isStripeOptionDisabled} onChange={() => setPaymentMethod("stripe")} className="text-cafe-gold focus:ring-cafe-gold" />
                      <span className="font-bold text-white">Pay Online (Card)</span>
                    </label>
                    {!isStripeAmountAllowed && (
                      <p className="text-sm text-amber-300">Online payment requires a minimum order of £ {STRIPE_MIN_INR_AMOUNT.toFixed(2)}.</p>
                    )}
                  </div>

                  <div className="bg-black/50 rounded-2xl p-6 mb-6">
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-white/70 font-bold">Total</span>
                      <span className=" text-3xl font-bold text-cafe-gold">£ {total.toFixed(2)}</span>
                    </div>
                  </div>

                  {errorMessage && <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{errorMessage}</div>}
                  {successMessage && <div className="mb-4 rounded-xl border border-green-500/25 bg-green-500/15 p-4 text-sm text-green-200">{successMessage}</div>}

                  <button onClick={handlePlaceOrder} disabled={submitting} className="w-full bg-cafe-gold text-[#110e0d] font-bold py-4 rounded-xl hover:bg-white transition-colors text-lg shadow-lg">
                    {customer ? (submitting ? "Processing..." : "Confirm & Pay") : "Sign In To Checkout"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Edit Item Modal */}
        <AnimatePresence>
          {editingItemKey && currentEditingItem && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-[400px] overflow-hidden rounded-[2rem] border border-cafe-gold/20 bg-[#110e0d] shadow-[0_25px_80px_rgba(0,0,0,0.55)] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 relative">
                  <button onClick={() => {
                    for(let i = 0; i < currentEditingItem.qty; i++) {
                      onRemove(currentEditingItem.id, currentEditingItem.cart_key);
                    }
                    setEditingItemKey(null);
                  }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-10">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <h3 className="absolute inset-x-0 text-center text-lg font-bold text-white truncate px-12">
                    {currentEditingItem.item_name}
                  </h3>

                  <button onClick={() => setEditingItemKey(null)} className="p-2 text-white/60 hover:bg-white/10 rounded-full transition-colors z-10">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-8 flex flex-col items-center">
                  {currentEditingItem.selected_addons?.length > 0 ? (
                    <div className="text-center mb-8">
                      {currentEditingItem.selected_addons.map((addon, idx) => (
                        <p key={idx} className="text-white/70 font-sans">{addon.addon_name}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm mb-8 font-sans">No customisations selected</p>
                  )}

                  <button 
                    onClick={() => {
                      openAddonsForItem(currentEditingItem);
                      setEditingItemKey(null);
                    }}
                    className="mb-8 px-6 py-2.5 rounded-full border border-cafe-gold/50 text-cafe-gold text-sm font-bold hover:bg-cafe-gold/10 transition-colors"
                  >
                    Customise Item
                  </button>

                  <div className="flex items-center gap-6">
                    <button onClick={() => onRemove(currentEditingItem.id, currentEditingItem.cart_key)} className="w-12 h-12 flex items-center justify-center rounded-full border border-cafe-gold/50 text-cafe-gold hover:bg-cafe-gold/10 transition-colors">
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="text-3xl font-bold text-white w-8 text-center">{currentEditingItem.qty}</span>
                    <button onClick={() => onAdd(currentEditingItem)} className="w-12 h-12 flex items-center justify-center rounded-full border border-cafe-gold/50 text-cafe-gold hover:bg-cafe-gold/10 transition-colors">
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-[#1a1715] border-t border-white/5">
                  <button onClick={() => setEditingItemKey(null)} className="w-full py-4 rounded-xl bg-cafe-gold text-[#110e0d] font-bold text-lg hover:bg-white transition-colors shadow-[0_8px_20px_rgba(212,175,55,0.2)]">
                    Update
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
