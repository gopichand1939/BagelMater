import React, { useState, useEffect } from "react";
import { ShoppingBag, Plus, Minus, ArrowLeft, X, Trash2, MapPin, Edit } from "lucide-react";
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
import { useGeolocation } from "../../hooks/useGeolocation";
import { CUSTOMER_NEAREST_OUTLET } from "../../config/api";

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

  const [deliveryForm, setDeliveryForm] = useState(() => {
    try {
      const savedAddress = localStorage.getItem("customer_delivery_address");
      if (savedAddress) {
        return JSON.parse(savedAddress);
      }
    } catch (e) {
      console.error("Failed to parse saved address:", e);
    }
    return {
      recipient_name: customer?.name || "",
      phone: customer?.phone || "",
      line1: "",
      line2: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      latitude: null,
      longitude: null,
      fullAddress: "",
      delivery_fee: 0,
      nearest_outlet_name: "",
      distance_km: null,
      delivery_available: null,
    };
  });

  const {
    loading: geoLoading,
    error: geoError,
    detectLocation,
    geocodeAddress,
    clearError: clearGeoError,
  } = useGeolocation();

  const [addressMethod, setAddressMethod] = useState("gps");

  const [deliveryChecking, setDeliveryChecking] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState(() => {
    // Attempt to seed from deliveryForm values if already stored
    if (deliveryForm.latitude && deliveryForm.longitude) {
      return {
        available: deliveryForm.delivery_available,
        fee: deliveryForm.delivery_fee,
        outlet: deliveryForm.nearest_outlet_name,
        distance: deliveryForm.distance_km,
        message: deliveryForm.delivery_available
          ? `Delivering from our ${deliveryForm.nearest_outlet_name} (${Number(deliveryForm.distance_km).toFixed(1)} km away).`
          : "Delivery unavailable for this address.",
      };
    }
    return null;
  });

  const checkDeliveryAvailability = async (lat, lon, currentForm = deliveryForm) => {
    setDeliveryChecking(true);
    setErrorMessage("");
    try {
      const response = await fetch(CUSTOMER_NEAREST_OUTLET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          subtotal: total,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to determine branch delivery availability.");
      }

      const { data } = resData;
      setDeliveryStatus({
        available: data.delivery_available,
        fee: data.delivery_fee,
        outlet: data.nearest_outlet.name,
        distance: data.nearest_outlet.distance_km,
        message: data.message,
      });

      // Update form state with geo results
      setDeliveryForm(prev => {
        const nextForm = {
          ...prev,
          ...currentForm,
          latitude: lat,
          longitude: lon,
          delivery_fee: data.delivery_available ? data.delivery_fee : 0,
          nearest_outlet_name: data.nearest_outlet.name,
          distance_km: data.nearest_outlet.distance_km,
          delivery_available: data.delivery_available,
        };
        // Persist to localStorage
        localStorage.setItem("customer_delivery_address", JSON.stringify(nextForm));
        return nextForm;
      });

      if (!data.delivery_available) {
        setErrorMessage(data.message);
      }
    } catch (err) {
      console.error("Availability check error:", err);
      setErrorMessage(err.message || "Could not check branch delivery availability.");
      setDeliveryStatus(null);
    } finally {
      setDeliveryChecking(false);
    }
  };

  const handleGPSLocation = async () => {
    clearErrorMessage();
    try {
      const location = await detectLocation();
      if (location) {
        // Break down reverse geocoded line items nicely
        const cleanLine = location.fullAddress.split(",").slice(0, 2).join(", ");
        const updatedForm = {
          ...deliveryForm,
          line1: cleanLine || location.fullAddress,
          city: location.city || deliveryForm.city,
          state: location.state || deliveryForm.state,
          pincode: location.postalCode || deliveryForm.pincode,
          latitude: location.latitude,
          longitude: location.longitude,
          fullAddress: location.fullAddress,
        };
        setDeliveryForm(updatedForm);
        
        await checkDeliveryAvailability(location.latitude, location.longitude, updatedForm);
      }
    } catch (err) {
      console.error("GPS detection error:", err);
    }
  };

  const clearErrorMessage = () => {
    setErrorMessage("");
  };

  const [isAddressConfirmed, setIsAddressConfirmed] = useState(() => {
    try {
      const savedAddress = localStorage.getItem("customer_delivery_address");
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress);
        return !!(parsed.line1?.trim() && parsed.city?.trim() && parsed.pincode?.trim() && parsed.delivery_available);
      }
    } catch (e) {}
    return false;
  });
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [orderType, setOrderType] = useState("collection");
  const [scheduledTime, setScheduledTime] = useState("");
  const [checkoutResult, setCheckoutResult] = useState({ status: "idle", message: "", order: null });

  const [editingItemKey, setEditingItemKey] = useState(null);
  const currentEditingItem = editingItemKey ? cart.find((c) => c.cart_key === editingItemKey) : null;

  useEffect(() => {
    if (editingItemKey && !currentEditingItem) {
      setEditingItemKey(null);
    }
  }, [currentEditingItem, editingItemKey]);

  const cafeOpen = isRestaurantOpen(restaurantSettings);

  useEffect(() => {
    if (deliveryForm.latitude && deliveryForm.longitude && orderType === "delivery") {
      checkDeliveryAvailability(deliveryForm.latitude, deliveryForm.longitude);
    }
  }, [orderType]);

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
    if (paymentMethod === "stripe" && isStripeOptionDisabled) {
      setPaymentMethod("cash_on_delivery");
    }
  }, [isStripeOptionDisabled, paymentMethod]);

  const handleFieldChange = (field, value) => {
    setDeliveryForm((prev) => {
      const nextForm = { ...prev, [field]: value };
      if (["line1", "city", "pincode"].includes(field)) {
        nextForm.latitude = null;
        nextForm.longitude = null;
        nextForm.delivery_available = null;
      }
      return nextForm;
    });
  };

  const resetMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleConfirmAddress = async () => {
    if (!deliveryForm.recipient_name?.trim()) {
      setErrorMessage("Please enter recipient name");
      return;
    }
    if (!deliveryForm.phone?.trim()) {
      setErrorMessage("Please enter phone number");
      return;
    }
    if (!deliveryForm.line1?.trim()) {
      setErrorMessage("Please enter address line 1");
      return;
    }
    if (!deliveryForm.city?.trim()) {
      setErrorMessage("Please enter city");
      return;
    }
    if (!deliveryForm.pincode?.trim()) {
      setErrorMessage("Please enter pincode");
      return;
    }

    setErrorMessage("");

    // If coordinates exist and have already been marked available, proceed directly
    if (deliveryForm.latitude && deliveryForm.longitude && deliveryForm.delivery_available) {
      setIsAddressConfirmed(true);
      try {
        localStorage.setItem("customer_delivery_address", JSON.stringify(deliveryForm));
      } catch (e) {
        console.error("Failed to save address to localStorage:", e);
      }
      return;
    }

    setDeliveryChecking(true);
    try {
      const queryStr = `${deliveryForm.line1}, ${deliveryForm.city}, ${deliveryForm.pincode}`;
      const resolved = await geocodeAddress(queryStr, {
        line1: deliveryForm.line1,
        city: deliveryForm.city,
        pincode: deliveryForm.pincode,
        state: deliveryForm.state,
      });
      if (resolved) {
        await checkDeliveryAvailability(resolved.latitude, resolved.longitude, {
          ...deliveryForm,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          fullAddress: resolved.fullAddress,
        });
        setIsAddressConfirmed(true);
      } else {
        throw new Error("Unable to resolve address coordinates. Please try manual entry or verify details.");
      }
    } catch (err) {
      console.error("Manual address lookup error:", err);
      setErrorMessage(err.message || "Failed to verify location. Please enter a valid address details.");
    } finally {
      setDeliveryChecking(false);
    }
  };

  const handleEditAddress = () => {
    setIsAddressConfirmed(false);
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

    if (orderType === "delivery" && !isAddressConfirmed) {
      setErrorMessage("Please confirm your delivery address details before placing your order.");
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
          latitude: deliveryForm.latitude,
          longitude: deliveryForm.longitude,
          full_address: deliveryForm.fullAddress,
        } : null,
        delivery_fee: orderType === "delivery" ? Number(deliveryForm.delivery_fee || 0) : 0,
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

      setCheckoutResult({
        status: "success",
        message: `Order placed successfully. Order number: ${order.order_number}`,
        order: order,
      });
      onClearCart?.();
      setOrdersRefreshKey?.((prev) => prev + 1);

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
      setStripeLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen pt-32 pb-24 bg-[#110e0d]">
      {checkoutResult.status === "success" && (
        <div className="fixed inset-0 z-[500] grid place-items-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-[min(460px,100%)] rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#1a1a2e_0%,#0f0c29_100%)] p-8 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black bg-green-500/20 text-green-200">
              ✓
            </div>
            <h2 className="mb-2 mt-5 text-2xl font-extrabold font-serif">Order Placed!</h2>
            <p className="mx-auto mb-6 max-w-[34ch] text-sm leading-6 text-white/65">
              Your order has been successfully placed. Order number: <span className="font-bold text-cafe-gold">{checkoutResult.order?.order_number}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-2xl border-0 bg-cafe-gold text-[#110e0d] px-4 py-3 text-sm font-extrabold"
                onClick={() => {
                  setCheckoutResult({ status: "idle", message: "", order: null });
                  navigate("/");
                  onRequireSignIn?.("orders");
                }}
              >
                View My Orders
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-extrabold text-white"
                onClick={() => {
                  setCheckoutResult({ status: "idle", message: "", order: null });
                  navigate("/menu");
                }}
              >
                Continue to Menu
              </button>
            </div>
          </div>
        </div>
      )}
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
              {/* Step 1: Order Mode */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cafe-gold text-[#110e0d] text-sm font-extrabold">1</span>
                  <h3 className="font-serif text-xl font-bold text-white">Order Mode</h3>
                </div>
                
                <div className="flex gap-3 mb-6">
                  <button type="button" onClick={() => setOrderType("collection")} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${orderType === "collection" ? "bg-cafe-gold text-[#110e0d]" : "bg-black/50 text-white/60 hover:text-white"}`}>Collection</button>
                  <button type="button" onClick={() => setOrderType("delivery")} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${orderType === "delivery" ? "bg-cafe-gold text-[#110e0d]" : "bg-black/50 text-white/60 hover:text-white"}`}>Delivery</button>
                </div>

                {!cafeOpen && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 mb-6">
                    The cafe is currently closed for immediate orders. You can schedule your order for later.
                  </div>
                )}

                <div>
                  <label className="text-sm font-bold text-white/80 mb-2 block">Scheduled Time (Optional)</label>
                  <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cafe-gold transition-colors text-sm" />
                </div>
              </div>

              {/* Step 2: Delivery Details (Only if orderType is delivery) */}
              {orderType === "delivery" && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${isAddressConfirmed ? 'bg-green-500 text-white' : 'bg-cafe-gold text-[#110e0d]'}`}>
                        {isAddressConfirmed ? '✓' : '2'}
                      </span>
                      <h3 className="font-serif text-xl font-bold text-white">Delivery Address</h3>
                    </div>
                    {isAddressConfirmed && (
                      <button onClick={handleEditAddress} className="text-xs text-cafe-gold hover:text-white transition-colors font-bold uppercase tracking-wider">
                        Edit
                      </button>
                    )}
                  </div>

                  {!isAddressConfirmed ? (
                    <div className="space-y-4">
                      {/* Address Method Selection */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMethod("gps");
                            clearErrorMessage();
                            setDeliveryStatus(null);
                          }}
                          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all border tracking-wider uppercase cursor-pointer ${
                            addressMethod === "gps"
                              ? "bg-cafe-gold text-[#110e0d] border-cafe-gold shadow-[0_4px_12px_rgba(230,175,98,0.25)]"
                              : "bg-black/40 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                          GPS Location
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMethod("manual");
                            clearErrorMessage();
                            setDeliveryStatus(null);
                            setDeliveryForm(prev => ({
                              ...prev,
                              latitude: null,
                              longitude: null,
                              delivery_available: null
                            }));
                          }}
                          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all border tracking-wider uppercase cursor-pointer ${
                            addressMethod === "manual"
                              ? "bg-cafe-gold text-[#110e0d] border-cafe-gold shadow-[0_4px_12px_rgba(230,175,98,0.25)]"
                              : "bg-black/40 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                          Manual Address
                        </button>
                      </div>

                      {addressMethod === "gps" && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-2xl p-4 mb-2">
                          <div>
                            <p className="text-sm font-bold text-white">Use GPS Location</p>
                            <p className="text-xs text-white/50 mt-0.5">Detect address automatically using coordinates</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGPSLocation}
                            disabled={geoLoading || deliveryChecking}
                            className="flex items-center justify-center gap-2 rounded-xl bg-cafe-gold/10 border border-cafe-gold/30 px-4 py-2.5 text-cafe-gold hover:bg-cafe-gold hover:text-[#110e0d] font-bold text-xs transition-all tracking-wider uppercase disabled:opacity-50"
                          >
                            {geoLoading || deliveryChecking ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cafe-gold border-t-transparent" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                            Detect Location
                          </button>
                        </div>
                      )}

                      {/* Loading status */}
                      {(geoLoading || deliveryChecking) && (
                        <div className="flex items-center gap-3 bg-cafe-gold/5 border border-cafe-gold/20 rounded-xl p-3.5 text-xs text-cafe-gold">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cafe-gold border-t-transparent shrink-0" />
                          <span>Determining Precise Location and checking delivery details...</span>
                        </div>
                      )}

                      {/* Geolocation/Nominatim Errors */}
                      {geoError && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
                          <span className="font-bold text-red-400 text-sm">⚠</span>
                          <div>
                            <p className="font-bold">Location Error</p>
                            <p className="opacity-90">{geoError}</p>
                          </div>
                        </div>
                      )}

                      {/* Delivery Status (Not yet confirmed but checked) */}
                      {deliveryStatus && !deliveryChecking && (
                        <div className={`rounded-xl border p-3.5 text-xs font-semibold flex items-start gap-2.5 ${
                          deliveryStatus.available 
                            ? 'bg-green-500/10 border-green-500/20 text-green-200' 
                            : 'bg-red-500/10 border-red-500/20 text-red-200'
                        }`}>
                          <MapPin className={`h-4.5 w-4.5 shrink-0 ${deliveryStatus.available ? 'text-green-400' : 'text-red-400'}`} />
                          <div>
                            <p className="font-bold text-sm mb-0.5">{deliveryStatus.available ? 'Delivery Available' : 'Delivery Out of Range'}</p>
                            <p className="opacity-85">{deliveryStatus.message}</p>
                            {deliveryStatus.available && (
                              <p className="mt-1 text-[11px] text-cafe-gold font-bold">
                                Delivery Fee: {deliveryStatus.fee > 0 ? `£ ${deliveryStatus.fee.toFixed(2)}` : 'FREE Delivery'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <input type="text" value={deliveryForm.recipient_name} onChange={(e) => handleFieldChange("recipient_name", e.target.value)} placeholder="Recipient name" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />
                      <input type="tel" value={deliveryForm.phone} onChange={(e) => handleFieldChange("phone", e.target.value)} placeholder="Phone number" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />

                      {(addressMethod === "manual" || deliveryForm.line1) && (
                        <>
                          <input type="text" value={deliveryForm.line1} onChange={(e) => handleFieldChange("line1", e.target.value)} placeholder="Address line 1 *" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />
                          <input type="text" value={deliveryForm.line2} onChange={(e) => handleFieldChange("line2", e.target.value)} placeholder="Address line 2 (Optional)" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={deliveryForm.city} onChange={(e) => handleFieldChange("city", e.target.value)} placeholder="City *" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />
                            <input type="text" value={deliveryForm.pincode} onChange={(e) => handleFieldChange("pincode", e.target.value)} placeholder="Pincode *" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />
                          </div>
                        </>
                      )}

                      <button 
                        type="button" 
                        onClick={handleConfirmAddress} 
                        disabled={deliveryChecking || (deliveryStatus && !deliveryStatus.available) || (addressMethod === "gps" && !deliveryForm.line1)}
                        className="w-full bg-cafe-gold/20 border border-cafe-gold/40 text-cafe-gold hover:bg-cafe-gold hover:text-[#110e0d] font-bold py-3.5 rounded-xl transition-all text-sm tracking-wider uppercase disabled:opacity-30 disabled:pointer-events-none"
                      >
                        {deliveryChecking ? "Verifying..." : "Confirm Delivery Address"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-white/70 space-y-1">
                        <p className="font-bold text-white text-base">{deliveryForm.recipient_name}</p>
                        <p className="text-white/50">{deliveryForm.phone}</p>
                        <p className="mt-2">{deliveryForm.line1}</p>
                        {deliveryForm.line2 && <p>{deliveryForm.line2}</p>}
                        <p>{deliveryForm.city} - {deliveryForm.pincode}</p>
                      </div>

                      {/* Nearest Branch & Delivery Fee details */}
                      {deliveryStatus && (
                        <div className={`rounded-xl border p-4 text-xs font-semibold flex items-start gap-2.5 ${
                          deliveryStatus.available 
                            ? 'bg-green-500/10 border-green-500/20 text-green-200' 
                            : 'bg-red-500/10 border-red-500/20 text-red-200'
                        }`}>
                          <MapPin className={`h-4.5 w-4.5 shrink-0 ${deliveryStatus.available ? 'text-green-400' : 'text-red-400'}`} />
                          <div>
                            <p className="font-bold text-sm mb-0.5">{deliveryStatus.available ? 'Delivering branch selected' : 'Delivery Unavailable'}</p>
                            <p className="opacity-85">{deliveryStatus.message}</p>
                            {deliveryStatus.available && (
                              <p className="mt-1 text-[11px] text-cafe-gold font-bold">
                                Delivery Fee: {deliveryStatus.fee > 0 ? `£ ${deliveryStatus.fee.toFixed(2)}` : 'FREE Delivery'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Payment & Checkout */}
              <div className={`rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 transition-opacity duration-300 ${
                orderType === "delivery" && !isAddressConfirmed ? "opacity-40 pointer-events-none" : "opacity-100"
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cafe-gold text-[#110e0d] text-sm font-extrabold">
                    {orderType === "delivery" ? '3' : '2'}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-white">Payment & Comments</h3>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-bold text-white/80 mb-2 block">Order Notes</label>
                    <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special requests (e.g. deliver at gate, no packaging)?" rows={2} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cafe-gold transition-colors" />
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <label className="text-sm font-bold text-white/80 mb-3 block">Payment Method</label>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-4 transition-all hover:border-cafe-gold/50">
                        <input type="radio" name="payment_method" value="cash_on_delivery" checked={paymentMethod === "cash_on_delivery"} onChange={() => setPaymentMethod("cash_on_delivery")} className="text-cafe-gold focus:ring-cafe-gold" />
                        <span className="font-bold text-white text-sm">
                          {orderType === "delivery" ? "Cash on Delivery" : "Pay at Collection"}
                        </span>
                      </label>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-4 transition-all ${isStripeOptionDisabled ? 'opacity-50' : 'hover:border-cafe-gold/50'}`}>
                        <input type="radio" name="payment_method" value="stripe" checked={paymentMethod === "stripe"} disabled={isStripeOptionDisabled} onChange={() => setPaymentMethod("stripe")} className="text-cafe-gold focus:ring-cafe-gold" />
                        <span className="font-bold text-white text-sm">Pay Online (Card)</span>
                      </label>
                      {!isStripeAmountAllowed && (
                        <p className="text-xs text-amber-300/80">Online payment requires a minimum order of £ {STRIPE_MIN_INR_AMOUNT.toFixed(2)}.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-6 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Subtotal</span>
                    <span className="font-bold text-white">£ {total.toFixed(2)}</span>
                  </div>
                  {orderType === "delivery" && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/60">Delivery Fee</span>
                      <span className="font-bold text-white">
                        {deliveryForm.delivery_fee > 0 ? `£ ${Number(deliveryForm.delivery_fee).toFixed(2)}` : "Free"}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/5 my-2 pt-2 flex justify-between items-center">
                    <span className="text-white/80 text-sm font-bold">Grand Total</span>
                    <span className="text-2xl font-bold text-cafe-gold">
                      £ {(total + (orderType === "delivery" ? Number(deliveryForm.delivery_fee || 0) : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {errorMessage && <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-200">{errorMessage}</div>}
                {successMessage && <div className="mb-4 rounded-xl border border-green-500/25 bg-green-500/15 p-4 text-xs text-green-200">{successMessage}</div>}

                {orderType === "delivery" && !isAddressConfirmed ? (
                  <div className="text-center py-3 text-xs text-white/40 font-semibold bg-white/5 rounded-xl border border-white/5">
                    ← Confirm Delivery Address to Pay
                  </div>
                ) : (
                  <button onClick={handlePlaceOrder} disabled={submitting} className="w-full bg-cafe-gold text-[#110e0d] font-extrabold py-4 rounded-xl hover:bg-white transition-colors text-sm uppercase tracking-wider shadow-lg hover:shadow-cafe-gold/10">
                    {customer ? (submitting ? "Processing..." : "Confirm & Pay") : "Sign In To Checkout"}
                  </button>
                )}
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
