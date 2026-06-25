import { useEffect, useState } from "react";
import { X, ShoppingBag, Plus, Minus, MapPin, Edit } from "lucide-react";
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
  const [deliveryForm, setDeliveryForm] = useState(() => {
    try {
      const savedAddress = localStorage.getItem("customer_delivery_address");
      if (savedAddress) {
        return JSON.parse(savedAddress);
      }
    } catch (e) {}
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
    setErrorMessage("");
    try {
      const location = await detectLocation();
      if (location) {
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
  const isStripeOptionDisabled =
    !STRIPE_PUBLISHABLE_KEY || !isStripeAmountAllowed;

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

    if (orderType === "delivery") {
      if (addressMethod === "gps" && !deliveryForm.line1.trim()) {
        setErrorMessage("Please click 'Detect Location' to retrieve your current location details.");
        setSuccessMessage("");
        return;
      }
      if (
        !deliveryForm.line1.trim() ||
        !deliveryForm.city.trim() ||
        !deliveryForm.pincode.trim()
      ) {
        setErrorMessage(
          "Please add address line 1, city, and pincode for delivery."
        );
        setSuccessMessage("");
        return;
      }
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

    let currentForm = { ...deliveryForm };

    try {
      const accessToken = customerAuthStorage.getAccessToken();

      if (!accessToken) {
        throw new Error("Please sign in again before placing your order.");
      }

      // If delivery mode is active and we don't have verified coordinates, geocode first!
      if (orderType === "delivery" && (!currentForm.latitude || !currentForm.longitude || !currentForm.delivery_available)) {
        const queryStr = `${currentForm.line1}, ${currentForm.city}, ${currentForm.pincode}`;
        const resolved = await geocodeAddress(queryStr, {
          line1: currentForm.line1,
          city: currentForm.city,
          pincode: currentForm.pincode,
          state: currentForm.state,
        });
        if (resolved) {
          // Perform availability check
          const response = await fetch(CUSTOMER_NEAREST_OUTLET, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              subtotal: total,
            }),
          });
          const resData = await response.json();
          if (!response.ok || !resData.success) {
            throw new Error(resData.message || "Failed to determine branch delivery availability.");
          }
          
          if (!resData.data.delivery_available) {
            throw new Error(resData.data.message);
          }

          currentForm = {
            ...currentForm,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            delivery_fee: resData.data.delivery_fee,
            nearest_outlet_name: resData.data.nearest_outlet.name,
            distance_km: resData.data.nearest_outlet.distance_km,
            delivery_available: true,
          };
          setDeliveryForm(currentForm);
          localStorage.setItem("customer_delivery_address", JSON.stringify(currentForm));
        } else {
          throw new Error("Unable to verify address coordinates. Please try manual entry or verify details.");
        }
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
          recipient_name: currentForm.recipient_name.trim(),
          phone: currentForm.phone.trim(),
          line1: currentForm.line1.trim(),
          line2: currentForm.line2.trim(),
          landmark: currentForm.landmark.trim(),
          city: currentForm.city.trim(),
          state: currentForm.state.trim(),
          pincode: currentForm.pincode.trim(),
          latitude: currentForm.latitude,
          longitude: currentForm.longitude,
          full_address: currentForm.fullAddress,
        } : null,
        delivery_fee: orderType === "delivery" ? Number(currentForm.delivery_fee || 0) : 0,
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
                    <div className="flex flex-col gap-1.5 mt-4 mb-3">
                      <label className="text-sm font-semibold text-white/80 m-0">
                        Delivery Address
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMethod("gps");
                            resetMessages();
                            setDeliveryStatus(null);
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-bold uppercase transition-all border cursor-pointer ${
                            addressMethod === "gps"
                              ? "bg-cafe-gold text-[#110e0d] border-cafe-gold shadow-[0_4px_10px_rgba(230,175,98,0.2)]"
                              : "bg-white/5 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          GPS Location
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMethod("manual");
                            resetMessages();
                            setDeliveryStatus(null);
                            setDeliveryForm(prev => ({
                              ...prev,
                              latitude: null,
                              longitude: null,
                              delivery_available: null
                            }));
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-bold uppercase transition-all border cursor-pointer ${
                            addressMethod === "manual"
                              ? "bg-cafe-gold text-[#110e0d] border-cafe-gold shadow-[0_4px_10px_rgba(230,175,98,0.2)]"
                              : "bg-white/5 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Manual Address
                        </button>
                      </div>
                    </div>

                    {addressMethod === "gps" && (
                      <div className="flex items-center justify-between gap-2 bg-black/40 border border-white/5 rounded-xl p-3 mb-2">
                        <span className="text-[11px] text-white/50">Auto-detect location</span>
                        <button
                          type="button"
                          onClick={handleGPSLocation}
                          disabled={geoLoading || deliveryChecking}
                          className="flex items-center gap-1.5 rounded-lg bg-cafe-gold/10 border border-cafe-gold/20 px-3 py-1.5 text-cafe-gold hover:bg-cafe-gold hover:text-[#110e0d] font-bold text-[10px] uppercase transition-all disabled:opacity-50"
                        >
                          {geoLoading || deliveryChecking ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-cafe-gold border-t-transparent" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5" />
                          )}
                          Detect Location
                        </button>
                      </div>
                    )}

                    {/* Geolocation Loading Indicator */}
                    {(geoLoading || deliveryChecking) && (
                      <div className="flex items-center gap-2 bg-cafe-gold/5 border border-cafe-gold/20 rounded-xl p-3 text-[11px] text-cafe-gold mb-2">
                        <span className="h-3 w-3 animate-spin rounded-full border border-cafe-gold border-t-transparent shrink-0" />
                        <span>Verifying delivery details...</span>
                      </div>
                    )}

                    {/* GPS Location Errors */}
                    {geoError && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-200 mb-2">
                        <span className="font-bold text-red-400">⚠ Location Error:</span> {geoError}
                      </div>
                    )}

                    {/* Branch Range Check Banner */}
                    {deliveryStatus && !deliveryChecking && (
                      <div className={`rounded-xl border p-3 text-[11px] font-semibold flex items-start gap-2 mb-2 ${
                        deliveryStatus.available 
                          ? 'bg-green-500/10 border-green-500/20 text-green-200' 
                          : 'bg-red-500/10 border-red-500/20 text-red-200'
                      }`}>
                        <MapPin className={`h-4 w-4 shrink-0 mt-0.5 ${deliveryStatus.available ? 'text-green-400' : 'text-red-400'}`} />
                        <div>
                          <p className="font-bold text-[12px] mb-0.5">{deliveryStatus.available ? 'Delivery Available' : 'Delivery Out of Range'}</p>
                          <p className="opacity-80 leading-relaxed">{deliveryStatus.message}</p>
                          {deliveryStatus.available && (
                            <p className="mt-1 text-[10px] text-cafe-gold font-bold">
                              Delivery Charge: {deliveryStatus.fee > 0 ? `£ ${deliveryStatus.fee.toFixed(2)}` : 'FREE Delivery'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

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
                    {(addressMethod === "manual" || deliveryForm.line1) ? (
                      <>
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
                
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors hover:bg-white/10">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash_on_delivery"
                    checked={paymentMethod === "cash_on_delivery"}
                    onChange={() => setPaymentMethod("cash_on_delivery")}
                  />
                  <span>
                    {orderType === "delivery"
                      ? "Cash on Delivery (Cash/Card)"
                      : "Pay at Collection (Cash/Card)"}
                  </span>
                </label>
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
            <div className="mb-4 space-y-1.5 px-1">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Subtotal</span>
                <span>Rs {total.toFixed(2)}</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Delivery Fee</span>
                  <span>{deliveryForm.delivery_fee > 0 ? `Rs ${Number(deliveryForm.delivery_fee).toFixed(2)}` : "Free"}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="font-sans text-sm uppercase tracking-wider text-white/80 font-bold">Total Amount</span>
                <span className="font-serif text-[24px] font-bold text-cafe-gold">
                  Rs {(total + (orderType === "delivery" ? Number(deliveryForm.delivery_fee || 0) : 0)).toFixed(2)}
                </span>
              </div>
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
