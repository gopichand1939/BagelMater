import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  MdSearch,
  MdRefresh,
  MdAccessTime,
  MdPlayArrow,
  MdCancel,
  MdPhone,
  MdEmail,
  MdOutlineReceipt,
  MdInfoOutline,
  MdCheck,
  MdCheckCircle,
} from "react-icons/md";
import {
  SCHEDULED_ORDER_LIST,
  SCHEDULED_ORDER_UPDATE,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { Card, PageSection } from "../ui";

function ScheduledOrder() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [isCheckingDues, setIsCheckingDues] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchWithRefreshToken(SCHEDULED_ORDER_LIST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, limit: 1000 }), // retrieve all upcoming scheduled orders
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch scheduled orders");
      }

      setData(responseData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch scheduled orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter schedules client-side by query
  const filteredOrders = useMemo(() => {
    return data.filter((order) => {
      const query = searchQuery.toLowerCase();
      const matchNumber = String(order.order_number || "").toLowerCase().includes(query);
      const matchCustomer = String(order.customer_name || "").toLowerCase().includes(query);
      const matchPhone = String(order.customer_phone || "").toLowerCase().includes(query);
      const matchSlot = String(order.scheduled_slot || "").toLowerCase().includes(query);
      return matchNumber || matchCustomer || matchPhone || matchSlot;
    });
  }, [data, searchQuery]);

  // Unified status update handler for scheduled pre-orders
  const handleUpdateOrderStatus = async (order, newStatus, newType = null) => {
    if (newStatus === "cancelled" && !window.confirm(`Are you sure you want to CANCEL scheduled order "${order.order_number}"?`)) {
      return;
    }
    if (newType === "ASAP" && !window.confirm(`Push scheduled order "${order.order_number}" to the active kitchen queue now?`)) {
      return;
    }
    if (newStatus === "delivered" && !window.confirm(`Mark scheduled order "${order.order_number}" as DELIVERED directly?`)) {
      return;
    }

    setProcessingId(order.id);
    try {
      const payload = {
        id: order.id,
        order_status: newStatus,
      };
      if (newType) {
        payload.order_type = newType;
      }

      const response = await fetchWithRefreshToken(SCHEDULED_ORDER_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to update order");
      }

      toast.success(`Order "${order.order_number}" status updated to "${newStatus}"!`);
      fetchData(); // Reload list
    } catch (error) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setProcessingId(null);
    }
  };

  // Manual Trigger to process due schedules (cron bypass helper)
  const handleCheckAndTransitionDues = async () => {
    setIsCheckingDues(true);
    try {
      const response = await fetchWithRefreshToken(
        `${window.location.origin.replace("5173", "15013")}/scheduled-orders/check_and_transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buffer_minutes: 30 }),
        }
      );
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to process due orders");
      }

      const count = responseData.transitioned_ids?.length || 0;
      if (count > 0) {
        toast.success(`Processed checks! Sent ${count} due pre-orders to live kitchen.`);
        fetchData();
      } else {
        toast.info("No scheduled orders are due for preparation within the next 30 minutes.");
      }
    } catch (error) {
      toast.error(error.message || "Failed to process scheduled orders");
    } finally {
      setIsCheckingDues(false);
    }
  };

  // Date/Time formatting helper
  const formatScheduleTime = (datetimeStr, slotStr) => {
    if (!datetimeStr) return "Not specified";
    const dateObj = new Date(datetimeStr);
    
    // Check if valid date
    if (Number.isNaN(dateObj.getTime())) return slotStr || "Invalid date";

    const formattedDate = dateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const formattedTime = dateObj.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${formattedDate} @ ${formattedTime} ${slotStr ? `(${slotStr})` : ""}`;
  };

  return (
    <div className="ui-page min-h-[calc(100vh-80px)] bg-slate-50/70 p-4 sm:p-6 text-slate-800">
      <div className="max-w-full space-y-6">
        
        {/* Header intro panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <PageSection eyebrow="Orders Management" title="Scheduled Pre-Orders" />
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Monitor and manage customer pre-orders scheduled for delivery or pickup at a future date.
              Orders will automatically push onto the live kitchen queue 30 minutes before their scheduled time, or you can push them manually.
            </p>
          </div>
        </div>

        {/* Toolbar filter dashboard */}
        <Card className="border border-slate-200/80 shadow-sm bg-white p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
              <MdSearch size={20} />
            </span>
            <input
              type="text"
              placeholder="Search by order number, customer name, phone, slot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end items-center">
            {/* Run manual check button */}
            <button
              type="button"
              disabled={isCheckingDues}
              onClick={handleCheckAndTransitionDues}
              className="flex items-center gap-1.5 h-9 px-4 text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition border border-emerald-300/40"
              title="Manually trigger due orders transition check"
            >
              {isCheckingDues ? "Checking..." : "🔄 Process Due Schedules"}
            </button>

            <button
              type="button"
              onClick={fetchData}
              className="flex items-center gap-1 h-9 px-3 text-xs font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-xl transition shadow-xs"
            >
              <MdRefresh size={16} />
              Reload
            </button>
            <div className="px-3.5 py-2 text-xs font-black bg-slate-100 text-slate-600 rounded-xl">
              {data.length} Upcoming
            </div>
          </div>
        </Card>

        {/* Scheduled pre-orders grid catalog */}
        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="mt-3 text-xs font-semibold">Loading scheduled orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 border border-slate-200 border-dashed rounded-2xl bg-white p-6">
            <MdAccessTime size={48} className="mx-auto text-slate-300 mb-2.5" />
            <h3 className="text-base font-extrabold text-slate-600">No Scheduled Pre-Orders Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              When customers place pre-orders for future delivery or pickup, they will show up in this control dashboard.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start">
            {filteredOrders.map((order) => {
              const itemsList = String(order.ordered_items || "").split(",").filter(Boolean);

              return (
                <div
                  key={order.id}
                  className="border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col justify-between min-h-[320px] transition hover:shadow-md hover:border-slate-300"
                >
                  {/* Card Header */}
                  <div>
                    <div className="bg-slate-50/70 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase">
                          Order Number
                        </span>
                        <h4 className="m-0 text-sm font-black text-slate-700 truncate leading-tight">
                          {order.order_number}
                        </h4>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <span className="rounded-lg bg-amber-50 border border-amber-500/10 text-amber-800 text-[0.68rem] px-2 py-0.5 font-black uppercase tracking-wide">
                          Pre-Order
                        </span>
                        {order.order_status === "placed" && (
                          <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-[0.68rem] px-2 py-0.5 font-black uppercase tracking-wide">
                            Placed
                          </span>
                        )}
                        {order.order_status === "accepted" && (
                          <span className="rounded-lg bg-blue-50 border border-blue-500/10 text-blue-700 text-[0.68rem] px-2 py-0.5 font-black uppercase tracking-wide animate-pulse">
                            Accepted
                          </span>
                        )}
                        {order.order_status === "delivered" && (
                          <span className="rounded-lg bg-green-50 border border-green-500/10 text-green-700 text-[0.68rem] px-2 py-0.5 font-black uppercase tracking-wide">
                            Delivered
                          </span>
                        )}
                        {order.order_status === "cancelled" && (
                          <span className="rounded-lg bg-red-50 border border-red-500/10 text-red-700 text-[0.68rem] px-2 py-0.5 font-black uppercase tracking-wide">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content body */}
                    <div className="p-4 space-y-4">
                      {/* Targets Target Date-Time Slot */}
                      <div className="bg-amber-50/45 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <MdAccessTime size={20} className="text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wide block leading-none mb-1">
                            Scheduled Preparation Due
                          </span>
                          <span className="text-xs font-black text-amber-900 leading-normal block">
                            {formatScheduleTime(order.scheduled_datetime, order.scheduled_slot)}
                          </span>
                        </div>
                      </div>

                      {/* Customer contact parameters */}
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <span className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase block">
                          Customer Details
                        </span>
                        <div className="font-extrabold text-slate-800 text-sm">
                          {order.customer_name}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MdPhone size={14} className="text-slate-400" />
                          <a href={`tel:${order.customer_phone}`} className="hover:text-emerald-600 hover:underline">
                            {order.customer_phone}
                          </a>
                        </div>
                        {order.customer_email && (
                          <div className="flex items-center gap-1.5">
                            <MdEmail size={14} className="text-slate-400" />
                            <span className="truncate">{order.customer_email}</span>
                          </div>
                        )}
                      </div>

                      {/* Items Summary list */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase block">
                          Items Summary
                        </span>
                        <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100/60 max-h-[100px] overflow-y-auto space-y-1">
                          {itemsList.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No items details.</span>
                          ) : (
                            itemsList.map((itemStr, idx) => (
                              <div key={idx} className="text-xs text-slate-700 flex items-start gap-1 font-semibold leading-relaxed">
                                <MdOutlineReceipt size={13} className="text-slate-400 mt-0.5 shrink-0" />
                                <span>{itemStr}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Financial values and Order notes */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase block">
                            Total Price
                          </span>
                          <span className="text-sm font-black text-emerald-600">
                            £ {Number(order.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase block">
                            Payment Method
                          </span>
                          <span className="text-[10.5px] font-extrabold text-slate-600 uppercase">
                            {String(order.payment_method || "COD").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {order.order_notes && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-500">
                          <strong className="text-slate-600 block mb-0.5">Notes:</strong>
                          {order.order_notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-50/35 border-t border-slate-100 flex gap-2">
                    {order.order_status === "placed" && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => handleUpdateOrderStatus(order, "accepted")}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition shadow-sm"
                        >
                          <MdCheck size={16} />
                          {processingId === order.id ? "Processing..." : "✔️ Accept"}
                        </button>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => handleUpdateOrderStatus(order, "cancelled")}
                          className="flex items-center justify-center gap-1 border border-red-100 hover:bg-red-500 hover:text-white text-red-500 font-extrabold text-xs py-2.5 px-3.5 rounded-xl transition"
                          title="Cancel pre-order"
                        >
                          <MdCancel size={16} />
                          Cancel
                        </button>
                      </>
                    )}

                    {order.order_status === "accepted" && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => handleUpdateOrderStatus(order, "accepted", "ASAP")}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition shadow-sm"
                          title="Push to live kitchen queue"
                        >
                          <MdPlayArrow size={16} />
                          {processingId === order.id ? "Processing..." : "🍳 Cook Now"}
                        </button>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => handleUpdateOrderStatus(order, "delivered")}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition shadow-sm"
                          title="Mark delivered directly"
                        >
                          <MdCheckCircle size={16} />
                          {processingId === order.id ? "Processing..." : "🚚 Deliver"}
                        </button>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => handleUpdateOrderStatus(order, "cancelled")}
                          className="flex items-center justify-center gap-1 border border-red-100 hover:bg-red-500 hover:text-white text-red-500 font-extrabold text-xs py-2.5 px-3.5 rounded-xl transition"
                          title="Cancel pre-order"
                        >
                          <MdCancel size={16} />
                        </button>
                      </>
                    )}

                    {(order.order_status === "delivered" || order.order_status === "cancelled") && (
                      <div className="w-full text-center py-1 text-xs font-black uppercase tracking-wider text-slate-400">
                        {order.order_status === "delivered" ? "✓ Completed & Delivered" : "✕ Cancelled Order"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduledOrder;
