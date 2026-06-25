import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaCheck, FaEye, FaFileInvoice, FaPhone, FaTimes, FaUtensils, FaFileCsv, FaFilePdf, FaDownload } from "react-icons/fa";
import {
  ORDER_BY_ID,
  ORDER_LIST,
  ORDER_UPDATE_STATUS,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import {
  setOrderData,
} from "../../Redux/CardSlice";
import { subscribeToAdminRealtimeEvent, ADMIN_REALTIME_EVENT_TYPES } from "../../realtime/adminRealtimeEvents";
import { startAdminNotificationAlert } from "../../Utils/notificationSound";

const formatCurrency = (value, currencyCode = "INR") => {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    return `${currencyCode || "INR"} ${amount.toFixed(2)}`;
  }
};

const truncateValue = (value, maxLength = 18) => {
  const normalized = String(value || "-");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const renderCompactText = (value, maxLength = 18, className = "") => (
  <span
    className={`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
    title={String(value || "-")}
  >
    {truncateValue(value, maxLength)}
  </span>
);

const parseOrderedItems = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const humanizeValue = (value) =>
  String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const normalizeAddress = (address) => {
  if (!address) {
    return {};
  }

  if (typeof address === "string") {
    try {
      return JSON.parse(address);
    } catch (_error) {
      return { address_line_1: address };
    }
  }

  return address;
};

const buildAddressLines = (address) => {
  const normalizedAddress = normalizeAddress(address);
  const addressLines = [
    normalizedAddress.full_name || normalizedAddress.recipient_name,
    normalizedAddress.phone,
    normalizedAddress.address_line_1 || normalizedAddress.line1,
    normalizedAddress.address_line_2 || normalizedAddress.line2,
    normalizedAddress.landmark,
    [normalizedAddress.city, normalizedAddress.state, normalizedAddress.pincode]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return addressLines.length > 0 ? addressLines : ["-"];
};

const buildInvoiceItems = (order) => {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item, index) => ({
      name: item.item_name || `Item ${index + 1}`,
      description: item.item_description || "",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.final_unit_price ?? item.unit_price ?? 0),
      addonAmount: Number(item.addon_amount || 0),
      lineTotal: Number(item.line_total || 0),
      selectedAddons: Array.isArray(item.selected_addons) ? item.selected_addons : [],
      notes: item.item_notes || "",
    }));
  }

  return parseOrderedItems(order.ordered_items).map((itemName) => ({
    name: itemName,
    description: "",
    quantity: "",
    unitPrice: "",
    addonAmount: "",
    lineTotal: "",
    selectedAddons: [],
    notes: "",
  }));
};

const isPaidOrder = (order) =>
  String(order?.payment_status || "").toLowerCase() === "paid" ||
  Number(order?.payment_transaction?.is_payment_success) === 1;

const buildTransactionLines = (order) => {
  const payment = order?.payment_transaction;

  if (!isPaidOrder(order)) {
    return [];
  }

  if (!payment) {
    return [
      ["Payment Status", humanizeValue(order.payment_status)],
      ["Transaction Details", "No transaction record attached"],
    ];
  }

  return [
    ["Payment Result", Number(payment.is_payment_success) === 1 ? "Success" : humanizeValue(payment.status)],
    ["Gateway", humanizeValue(payment.gateway)],
    ["RRN", payment.rrn],
    ["Transaction ID", payment.transaction_id],
    ["Provider Payment ID", payment.provider_payment_id],
    ["Provider Charge ID", payment.provider_charge_id],
    ["Balance Transaction ID", payment.provider_balance_transaction_id],
    ["Payment Method", humanizeValue(payment.payment_method || order.payment_method)],
    ["Paid Amount", formatCurrency(payment.amount ?? order.total_amount, payment.currency_code || order.currency_code)],
    ["Paid At", formatDateTime(payment.paid_at)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
};

const buildInvoiceHtml = (order) => {
  const currencyCode = order.currency_code || "INR";
  const invoiceItems = buildInvoiceItems(order);
  const addressLines = buildAddressLines(order.delivery_address);
  const transactionLines = buildTransactionLines(order);
  const printedAt = new Date().toLocaleString();
  const money = (value) =>
    value === "" || value === null || value === undefined
      ? "-"
      : formatCurrency(value, currencyCode);
  const itemRows = invoiceItems.length
    ? invoiceItems
      .map((item, index) => {
        const addons = item.selectedAddons.length
          ? `<div class="muted small">Addons: ${escapeHtml(
            item.selectedAddons
              .map((addon) => {
                const addonName = addon.addon_name || addon.name || "Addon";
                const addonPrice =
                  addon.addon_price !== undefined && addon.addon_price !== null
                    ? ` (${money(addon.addon_price)})`
                    : "";

                return `${addonName}${addonPrice}`;
              })
              .join(", ")
          )}</div>`
          : "";
        const notes = item.notes
          ? `<div class="muted small">Note: ${escapeHtml(item.notes)}</div>`
          : "";

        return `
            <tr>
              <td>${index + 1}</td>
              <td>
                <strong>${escapeHtml(item.name)}</strong>
                ${item.description ? `<div class="muted small item-description">${escapeHtml(item.description)}</div>` : ""}
                ${addons}
                ${notes}
              </td>
              <td class="right">${escapeHtml(item.quantity || "-")}</td>
              <td class="right">${money(item.unitPrice)}</td>
              <td class="right">${money(item.addonAmount)}</td>
              <td class="right">${money(item.lineTotal)}</td>
            </tr>
          `;
      })
      .join("")
    : `<tr><td colspan="6" class="center muted">No items found</td></tr>`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${escapeHtml(order.order_number || order.id || "")}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
          .invoice { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 14mm 12mm; }
          .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
          h2 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0; }
          .muted { color: #64748b; }
          .small { font-size: 10.5px; line-height: 1.25; }
          .right { text-align: right; }
          .center { text-align: center; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
          .box { border: 1px solid #e2e8f0; padding: 9px; border-radius: 6px; }
          .line { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; font-size: 11px; }
          .transaction-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 12px; margin-top: 6px; }
          .transaction-item { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; overflow-wrap: anywhere; }
          .label { display: block; color: #64748b; font-size: 8.5px; text-transform: uppercase; }
          .value { display: block; margin-top: 1px; font-size: 10px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #0f172a; color: #fff; font-size: 10px; padding: 6px 7px; text-align: left; }
          td { border-bottom: 1px solid #e2e8f0; padding: 6px 7px; vertical-align: top; font-size: 10.5px; }
          td strong { font-size: 11px; }
          .item-description { max-width: 92mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .totals { width: 42%; margin-left: auto; margin-top: 8px; font-size: 11px; }
          .grand { border-top: 2px solid #0f172a; margin-top: 5px; padding-top: 6px; font-size: 14px; font-weight: 700; }
          .footer { margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #64748b; }
          @media print {
            body { background: #fff; }
            .invoice { width: auto; min-height: auto; height: 287mm; margin: 0; padding: 7mm 8mm; overflow: hidden; }
            h1 { font-size: 20px; }
            h2 { font-size: 10.5px; margin-bottom: 4px; }
            .top { padding-bottom: 7px; }
            .grid { gap: 7px; margin-top: 8px; }
            .box { padding: 7px; }
            .transaction-grid { grid-template-columns: repeat(3, 1fr); gap: 4px 9px; }
            .small { font-size: 9px; line-height: 1.15; }
            .line { font-size: 9.5px; padding: 1px 0; }
            .label { font-size: 7.5px; }
            .value { font-size: 8.8px; }
            table { margin-top: 8px; }
            th { font-size: 8.5px; padding: 4px 5px; }
            td { font-size: 8.8px; padding: 4px 5px; }
            td strong { font-size: 9.5px; }
            .item-description { display: none; }
            .totals { margin-top: 6px; font-size: 9.5px; }
            .grand { font-size: 12px; padding-top: 4px; }
            .footer { display: none; }
            @page { size: A4; margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <main class="invoice">
          <section class="top">
            <div>
              <h1>Invoice</h1>
              <div class="muted">Restaurant Admin</div>
            </div>
            <div class="right small">
              <div><strong>Invoice No:</strong> ${escapeHtml(order.order_number || `ORDER-${order.id}`)}</div>
              <div><strong>Order ID:</strong> ${escapeHtml(order.id || "-")}</div>
              <div><strong>Order Date:</strong> ${escapeHtml(formatDateTime(order.created_at))}</div>
              <div><strong>Printed:</strong> ${escapeHtml(printedAt)}</div>
            </div>
          </section>

          <section class="grid">
            <div class="box">
              <h2>Customer</h2>
              <div>${escapeHtml(order.customer_name || "-")}</div>
              <div class="muted small">${escapeHtml(order.customer_email || "-")}</div>
              <div class="muted small">${escapeHtml(order.customer_phone || "-")}</div>
            </div>
            <div class="box">
              <h2>Delivery Address</h2>
              ${addressLines.map((line) => `<div class="small">${escapeHtml(line)}</div>`).join("")}
            </div>
          </section>

          <section class="grid">
            <div class="box">
              <h2>Order</h2>
              <div class="line"><span>Status</span><strong>${escapeHtml(humanizeValue(order.order_status))}</strong></div>
              <div class="line"><span>Payment Status</span><strong>${escapeHtml(humanizeValue(order.payment_status))}</strong></div>
              <div class="line"><span>Method</span><strong>${escapeHtml(humanizeValue(order.payment_method))}</strong></div>
            </div>
            <div class="box">
              <h2>Notes</h2>
              <div class="small">${escapeHtml(order.order_notes || "-")}</div>
            </div>
          </section>

          ${transactionLines.length > 0
      ? `<section class="box" style="margin-top: 22px;">
                  <h2>Transaction Details</h2>
                  <div class="transaction-grid">
                    ${transactionLines
        .map(
          ([label, value]) => `
                          <div class="transaction-item">
                            <span class="label">${escapeHtml(label)}</span>
                            <span class="value">${escapeHtml(value || "-")}</span>
                          </div>
                        `
        )
        .join("")}
                  </div>
                </section>`
      : ""
    }

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Unit</th>
                <th class="right">Addons</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <section class="totals">
            <div class="line"><span>Subtotal</span><strong>${money(order.subtotal_amount)}</strong></div>
            <div class="line"><span>Discount</span><strong>${money(order.discount_amount)}</strong></div>
            <div class="line"><span>Addons</span><strong>${money(order.addon_amount)}</strong></div>
            <div class="line"><span>Tax</span><strong>${money(order.tax_amount)}</strong></div>
            <div class="line"><span>Delivery</span><strong>${money(order.delivery_fee)}</strong></div>
            <div class="line grand"><span>Total</span><span>${money(order.total_amount)}</span></div>
          </section>

          <section class="footer">
            This invoice was generated after the order was marked delivered.
          </section>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;
};

const ORDER_STATUS_TABS = [
  { label: "All", value: "" },
  { label: "New", value: "placed" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_STYLES = {
  placed: "border-yellow-300 bg-yellow-50 text-yellow-800",
  accepted: "border-blue-300 bg-blue-50 text-blue-800",
  preparing: "border-orange-300 bg-orange-50 text-orange-800",
  ready: "border-purple-300 bg-purple-50 text-purple-800",
  delivered: "border-green-300 bg-green-50 text-green-800",
  cancelled: "border-red-300 bg-red-50 text-red-800",
};

const STATUS_ACCENT = {
  placed: "border-l-yellow-400",
  accepted: "border-l-blue-400",
  preparing: "border-l-orange-400",
  ready: "border-l-purple-400",
  delivered: "border-l-green-400",
  cancelled: "border-l-red-400",
};

const NEXT_STATUS_ACTION = {
  accepted: { label: "Preparing", status: "preparing" },
  preparing: { label: "Ready", status: "ready" },
  ready: { label: "Delivered", status: "delivered" },
};

const getOrderKey = (order) => order?.order_number || `#${order?.id || "-"}`;

const getShortOrderKey = (order) => {
  const key = getOrderKey(order);
  if (key.includes("-")) {
    const parts = key.split("-");
    return `#${parts[parts.length - 1]}`;
  }
  return key;
};

const getAgeInMinutes = (createdAt) => {
  const createdTime = new Date(createdAt).getTime();

  if (!createdAt || Number.isNaN(createdTime)) {
    return 0;
  }

  return Math.max(Math.floor((Date.now() - createdTime) / 60000), 0);
};

const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return "-";
  }

  const minutes = getAgeInMinutes(value);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const isToday = new Date().toDateString() === date.toDateString();
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (isToday) {
    return `Today • ${timeStr}`;
  }

  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${timeStr}`;
};

const getDateInputValue = (value) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const isCodOrder = (order) =>
  ["cash_on_delivery", "cod", "cash"].includes(
    String(order?.payment_method || "").toLowerCase()
  );

const getPaymentLabel = (order) => {
  const isPaid = String(order?.payment_status || "").toLowerCase() === "paid";

  if (isPaid) {
    return "PAID";
  }

  return isCodOrder(order) ? "COD Pending" : humanizeValue(order?.payment_status);
};

const isPriorityOrder = (order) => {
  const itemCount = Number(order?.item_count || 0);
  const amount = Number(order?.total_amount || 0);
  const oldPendingOrder =
    String(order?.order_status || "").toLowerCase() === "placed" &&
    getAgeInMinutes(order?.created_at) >= 10;

  return itemCount >= 8 || amount >= 1500 || oldPendingOrder;
};

function Order() {
  const NEW_ORDER_HIGHLIGHT_MS = 10000;
  const hasSeenRealtimeConnectionRef = useRef(false);
  const ordersListRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState([]);
  const [activeStatus, setActiveStatus] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    paymentType: "",
    paymentStatus: "",
    date: "",
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const playNewOrderSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.36);
    } catch (_error) {
      // Browser autoplay rules can block sound until the first user gesture.
    }
  };

  const highlightOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    setHighlightedOrderIds((prev) => [...new Set([...prev, Number(orderId)])]);

    window.setTimeout(() => {
      setHighlightedOrderIds((prev) => prev.filter((value) => value !== Number(orderId)));
    }, NEW_ORDER_HIGHLIGHT_MS);
  };

  const scrollOrdersTop = () => {
    window.requestAnimationFrame(() => {
      ordersListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const applyRealtimeOrderChange = (change) => {
    const action = String(change?.action || "").toLowerCase();
    const realtimeOrder = change?.entityData || null;
    const targetOrderId = Number(change?.orderId || change?.entityId || realtimeOrder?.id || 0);

    if (!targetOrderId) {
      return;
    }

    if (action === "created" && realtimeOrder) {
      setTotalCount((prev) => prev + 1);
      setData((prev) => {
        const nextData = [
          realtimeOrder,
          ...prev.filter((item) => Number(item.id) !== targetOrderId),
        ].slice(0, pageSize);

        dispatch(setOrderData(nextData));
        return nextData;
      });
      return;
    }

    if (action === "updated" && realtimeOrder) {
      setData((prev) => {
        const nextData = prev.map((item) =>
          Number(item.id) === targetOrderId ? { ...item, ...realtimeOrder } : item
        );

        dispatch(setOrderData(nextData));
        return nextData;
      });
      return;
    }

    if (action === "deleted") {
      setTotalCount((prev) => Math.max(prev - 1, 0));
      setData((prev) => {
        const nextData = prev.filter((item) => Number(item.id) !== targetOrderId);

        dispatch(setOrderData(nextData));
        return nextData;
      });
    }
  };

  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);

    try {
      const response = await fetchWithRefreshToken(ORDER_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page,
          limit,
          status: activeStatus,
          search: filters.search,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch orders");
      }

      setData(responseData.data || []);
      setTotalCount(responseData.pagination?.totalRecords || 0);
      dispatch(setOrderData(responseData.data || []));
    } catch (error) {
      toast.error(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize, activeStatus, filters.search]);

  useEffect(() => {
    return subscribeToAdminRealtimeEvent(
      ADMIN_REALTIME_EVENT_TYPES.ORDER_UPDATED,
      (change) => {
        const targetOrderId = change?.orderId || change?.entityId || null;

        if (change?.action === "created" && targetOrderId) {
          highlightOrder(targetOrderId);
          startAdminNotificationAlert();
          applyRealtimeOrderChange(change);
          setCurrentPage(1);
          scrollOrdersTop();
          fetchData(1, pageSize);
          return;
        }

        if (targetOrderId) {
          highlightOrder(targetOrderId);
        }

        applyRealtimeOrderChange(change);
        fetchData(currentPage, pageSize);
      }
    );
  }, [currentPage, pageSize, activeStatus, filters.search]);

  useEffect(() => {
    return subscribeToAdminRealtimeEvent(
      ADMIN_REALTIME_EVENT_TYPES.NOTIFICATION_UPDATED,
      (change) => {
        const isOrderCreatedNotification =
          String(change?.action || "").toLowerCase() === "created" &&
          String(change?.entityData?.entity || "").toLowerCase() === "order" &&
          String(change?.entityData?.action || "").toLowerCase() === "created" &&
          String(change?.entityData?.source || "").toLowerCase() !== "admin-backend";

        if (!isOrderCreatedNotification) {
          return;
        }

        const targetOrderId =
          change?.entityData?.entity_id ||
          change?.entityData?.payload?.orderId ||
          null;

        if (targetOrderId) {
          highlightOrder(targetOrderId);
          startAdminNotificationAlert();
        }

        setCurrentPage(1);
        scrollOrdersTop();
        fetchData(1, pageSize);
      }
    );
  }, [currentPage, pageSize, activeStatus, filters.search]);

  useEffect(() => {
    return subscribeToAdminRealtimeEvent(
      ADMIN_REALTIME_EVENT_TYPES.CONNECTION_OPENED,
      () => {
        if (!hasSeenRealtimeConnectionRef.current) {
          hasSeenRealtimeConnectionRef.current = true;
          return;
        }

        fetchData(currentPage, pageSize);
      }
    );
  }, [currentPage, pageSize, activeStatus, filters.search]);

  const handlePageChange = (page, nextPageSize) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handleDownloadCSV = (order) => {
    const items = buildInvoiceItems(order);
    const csvRows = [];

    // Header
    csvRows.push(["Item", "Notes", "Addons", "Price", "Qty", "Total"]);

    items.forEach(item => {
      const addonsText = item.selectedAddons.map(a => `${a.addon_name || a.name || "Addon"} (${a.addon_price || 0})`).join(" | ");
      csvRows.push([
        `"${String(item.name || "").replace(/"/g, '""')}"`,
        `"${String(item.notes || "").replace(/"/g, '""')}"`,
        `"${addonsText.replace(/"/g, '""')}"`,
        item.price,
        item.quantity,
        item.lineTotal
      ]);
    });

    const csvString = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `Invoice_${getOrderKey(order)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintInvoice = async (rowData) => {
    if (!rowData?.id) {
      toast.error("Order details not found");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Please allow popups to print the invoice");
      return;
    }

    printWindow.document.write("<p style=\"font-family: Arial, sans-serif; padding: 24px;\">Preparing invoice...</p>");
    printWindow.document.close();

    try {
      const response = await fetchWithRefreshToken(ORDER_BY_ID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: Number(rowData.id) }),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch order invoice");
      }

      const invoiceOrder = {
        ...rowData,
        ...(responseData.data || {}),
        payment_transaction:
          responseData.data?.payment_transaction || rowData.payment_transaction || null,
      };

      printWindow.document.open();
      printWindow.document.write(buildInvoiceHtml(invoiceOrder));
      printWindow.document.close();
    } catch (error) {
      printWindow.close();
      toast.error(error.message || "Failed to print invoice");
    }
  };

  const handleOpenDetails = async (rowData) => {
    if (!rowData?.id) {
      return;
    }

    setSelectedOrder(rowData);
    setDetailsLoading(true);

    try {
      const response = await fetchWithRefreshToken(ORDER_BY_ID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: Number(rowData.id) }),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch order details");
      }

      setSelectedOrder({
        ...rowData,
        ...(responseData.data || {}),
      });
    } catch (error) {
      toast.error(error.message || "Failed to fetch order details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (rowData, nextStatus) => {
    if (!rowData?.id || !nextStatus) {
      return;
    }

    setUpdatingOrderId(rowData.id);

    try {
      const response = await fetchWithRefreshToken(ORDER_UPDATE_STATUS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(rowData.id),
          order_status: nextStatus,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to update order");
      }

      const updatedOrder = responseData.data || { ...rowData, order_status: nextStatus };

      setData((prev) => {
        const nextData = prev.map((item) =>
          Number(item.id) === Number(rowData.id) ? { ...item, ...updatedOrder } : item
        );

        dispatch(setOrderData(nextData));
        return nextData;
      });
      setSelectedOrder((prev) =>
        Number(prev?.id) === Number(rowData.id) ? { ...prev, ...updatedOrder } : prev
      );
      toast.success(`Order moved to ${humanizeValue(nextStatus)}`);
    } catch (error) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCallCustomer = (rowData) => {
    if (!rowData?.customer_phone) {
      toast.error("Customer phone not available");
      return;
    }

    window.open(`tel:${rowData.customer_phone}`);
  };

  const visibleOrders = useMemo(() => {
    return [...data]
      .filter((order) => {
        const paymentTypeMatches =
          !filters.paymentType ||
          String(order.payment_method || "").toLowerCase() === filters.paymentType;
        const paymentStatusMatches =
          !filters.paymentStatus ||
          String(order.payment_status || "").toLowerCase() === filters.paymentStatus;
        const dateMatches =
          !filters.date ||
          getDateInputValue(order.created_at) === filters.date;

        return paymentTypeMatches && paymentStatusMatches && dateMatches;
      })
      .sort((first, second) => {
        const firstHighlighted = highlightedOrderIds.includes(Number(first.id)) ? 1 : 0;
        const secondHighlighted = highlightedOrderIds.includes(Number(second.id)) ? 1 : 0;

        if (firstHighlighted !== secondHighlighted) {
          return secondHighlighted - firstHighlighted;
        }

        return Number(second.id || 0) - Number(first.id || 0);
      });
  }, [data, filters, highlightedOrderIds]);

  const renderStatusPill = (status) => {
    const normalizedStatus = String(status || "placed").toLowerCase();

    return (
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${STATUS_STYLES[normalizedStatus] || "border-slate-300 bg-slate-50 text-slate-700"
          }`}
      >
        {humanizeValue(normalizedStatus)}
      </span>
    );
  };

  const renderQuickActions = (order) => {
    const status = String(order.order_status || "").toLowerCase();
    const isUpdating = Number(updatingOrderId) === Number(order.id);

    if (status === "cancelled") {
      return (
        <div className="flex w-full items-center justify-between rounded-[6px] border border-red-100 bg-red-50/50 px-3 py-2">
          <span className="text-[13px] font-bold text-red-500">✕ Order Cancelled</span>
        </div>
      );
    }

    const steps = [
      { id: "accepted", label: "Accept", from: "placed" },
      { id: "preparing", label: "Preparing", from: "accepted" },
      { id: "ready", label: "Ready", from: "preparing" },
      { id: "delivered", label: "Delivered", from: "ready" },
    ];

    const statusIndex = {
      placed: -1,
      accepted: 0,
      preparing: 1,
      ready: 2,
      delivered: 3
    }[status] ?? -1;

    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = statusIndex >= index;
            const isCurrent = statusIndex === index - 1;

            let buttonClass = "flex items-center justify-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-[12px] font-extrabold transition-all duration-300 whitespace-nowrap ";
            let content = null;

            if (isCompleted) {
              buttonClass += "border-transparent bg-green-50 text-green-600 opacity-80 cursor-default shadow-none";
              content = <><FaCheck className="text-[10px]" /> {step.id === 'accepted' ? 'Accepted' : step.label}</>;
            } else if (isCurrent) {
              buttonClass += isUpdating
                ? "border-brand-300 bg-brand-400 text-white cursor-wait"
                : "border-brand-500 bg-brand-500 text-white hover:bg-brand-600 shadow-sm cursor-pointer";
              content = isUpdating ? "Updating..." : step.label;
            } else {
              buttonClass += "border-transparent bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed";
              content = step.label;
            }

            if (step.id === 'accepted' && status === 'placed') {
              return [
                <div key="action-group" className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    className={buttonClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isUpdating) handleUpdateOrderStatus(order, step.id);
                    }}
                  >
                    {content}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-1.5 rounded-[6px] border border-red-200 bg-white px-2.5 py-1 text-[12px] font-extrabold text-red-600 transition hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isUpdating && window.confirm("Are you sure you want to cancel this order?")) {
                        handleUpdateOrderStatus(order, "cancelled");
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>,
                <div key={`line-${step.id}`} className="mx-1.5 h-[2px] flex-1 rounded-full bg-slate-100 transition-colors duration-500"></div>
              ];
            }

            return [
              <button
                key={`btn-${step.id}`}
                type="button"
                disabled={!isCurrent || isUpdating}
                className={buttonClass}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCurrent && !isUpdating) {
                    handleUpdateOrderStatus(order, step.id);
                  }
                }}
              >
                {content}
              </button>,
              index < steps.length - 1 && (
                <div key={`line-${step.id}`} className={`mx-1.5 h-[2px] flex-1 rounded-full transition-colors duration-500 ${isCompleted ? 'bg-green-200' : 'bg-slate-100'}`}></div>
              )
            ];
          })}
        </div>

        {status === "delivered" && (
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-[6px] border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50"
              onClick={(e) => { e.stopPropagation(); handleDownloadCSV(order); }}
            >
              <FaFileCsv className="text-[12px] text-green-600" /> CSV
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-[6px] border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50"
              onClick={(e) => { e.stopPropagation(); handlePrintInvoice(order); }}
            >
              <FaFilePdf className="text-[12px] text-red-500" /> PDF / Print
            </button>
          </div>
        )}
      </div>
    );
  };

  const selectedOrderItems = selectedOrder ? buildInvoiceItems(selectedOrder) : [];
  const selectedAddressLines = selectedOrder ? buildAddressLines(selectedOrder.delivery_address) : [];
  const selectedTransactionLines = selectedOrder ? buildTransactionLines(selectedOrder) : [];

  return (
    <div className="grid min-h-0 content-start gap-3">
      <section className="grid min-h-0 gap-3 rounded-[8px] border border-border-subtle bg-surface-panel p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className="min-w-[92px] rounded-[8px] border-0 bg-[#57b98f] px-4 py-[11px] font-semibold text-white"
            onClick={() => navigate("/addorder")}
          >
            Add
          </button>
          <div className="flex items-center gap-[10px] font-semibold text-slate-500">
            <span>Home</span>
            <span>/</span>
            <strong className="text-brand-500">Orders</strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-extrabold transition ${activeStatus === tab.value
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-border-subtle bg-white text-slate-600 hover:bg-slate-50"
                }`}
              onClick={() => {
                setActiveStatus(tab.value);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Search Orders</span>
            <input
              className="h-9 rounded-[6px] border border-slate-200 px-3 text-[13px] outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Order ID, Customer, Phone..."
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />
          </label>
          <label className="flex min-w-[140px] flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Payment Type</span>
            <select
              className="h-9 rounded-[6px] border border-slate-200 px-2.5 text-[13px] outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={filters.paymentType}
              onChange={(event) => handleFilterChange("paymentType", event.target.value)}
            >
              <option value="">All Types</option>
              <option value="cash_on_delivery">COD</option>
              <option value="cod">COD short</option>
              <option value="stripe">Stripe</option>
            </select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Payment Status</span>
            <select
              className="h-9 rounded-[6px] border border-slate-200 px-2.5 text-[13px] outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={filters.paymentStatus}
              onChange={(event) => handleFilterChange("paymentStatus", event.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
          <label className="flex min-w-[130px] flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Date</span>
            <input
              className="h-9 rounded-[6px] border border-slate-200 px-2.5 text-[13px] outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              type="date"
              value={filters.date}
              onChange={(event) => handleFilterChange("date", event.target.value)}
            />
          </label>
        </div>

        <div className="relative min-h-0">
          <div className="min-w-0 bg-transparent">
            <div ref={ordersListRef} className="max-h-[calc(100vh-280px)] overflow-y-auto grid gap-4 pb-2">
              {loading ? (
                <div className="grid min-h-[220px] place-items-center">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    {/* Glow backdrop */}
                    <div className="absolute inset-0 animate-ping rounded-full bg-emerald-100 opacity-20"></div>
                    {/* Subtle outer border */}
                    <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-100"></div>
                    {/* Main spinning indicator */}
                    <div className="absolute inset-0 animate-spin rounded-full border-[3.5px] border-transparent border-t-[#57b98f] border-l-[#57b98f]"></div>
                  </div>
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center text-slate-500">No orders found</div>
              ) : (
                visibleOrders.map((order) => {
                  const isHighlighted = highlightedOrderIds.includes(Number(order.id));
                  const status = String(order.order_status || "placed").toLowerCase();
                  const priority = isPriorityOrder(order);

                  return (
                    <article
                      key={order.id}
                      onClick={() => handleOpenDetails(order)}
                      className={`grid gap-2 rounded-[8px] border border-border-subtle border-l-4 px-4 py-3 transition cursor-pointer shadow-sm hover:shadow-md ${STATUS_ACCENT[status] || "border-l-slate-300"
                        } ${isHighlighted
                          ? "animate-pulse bg-orange-50 shadow-[inset_0_0_0_2px_rgba(249,115,22,0.22)]"
                          : priority
                            ? "bg-red-50/60 hover:bg-red-50"
                            : "bg-white"
                        }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black text-slate-900">
                              {order.customer_name || "Unknown Customer"}
                            </span>
                            <span className="ml-1 text-[15px] font-bold text-slate-500">
                              {getShortOrderKey(order)}
                            </span>
                            <span className="ml-1 hidden text-[12px] font-semibold text-slate-400 opacity-70 sm:inline-block">
                              ({getOrderKey(order)})
                            </span>
                            {isHighlighted ? (
                              <span className="ml-1 rounded-[4px] bg-orange-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                                New
                              </span>
                            ) : null}
                            {priority ? (
                              <span className={`ml-1 rounded-[4px] border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${status === "placed" && getAgeInMinutes(order.created_at) >= 10 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                                {status === "placed" && getAgeInMinutes(order.created_at) >= 10 ? 'Delayed' : 'Priority'}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
                            <span>{Number(order.item_count || 0)} items</span>
                            <span className="text-slate-300">•</span>
                            <span className={String(order.payment_status || "").toLowerCase() === "paid" ? "text-green-600" : "text-amber-600"}>
                              {getPaymentLabel(order)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-extrabold text-slate-900">{formatCurrency(order.total_amount, order.currency_code)}</span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[14px] font-bold text-slate-500">
                            <span className="text-brand-600">Current Stage: <span className="capitalize">{humanizeValue(status)}</span></span>
                            <span className="text-slate-300">•</span>
                            <span>{formatRelativeTime(order.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex w-full items-center" onClick={(e) => e.stopPropagation()}>
                        {renderQuickActions(order)}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border-subtle pt-2 pb-0.5 px-2">
              <span className="text-sm font-extrabold text-slate-500">Total Rows: {totalCount}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 rounded-[8px] border border-border-subtle px-3 text-sm font-extrabold text-slate-600 disabled:opacity-50"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1, pageSize)}
                >
                  Prev
                </button>
                <span className="grid h-9 min-w-9 place-items-center rounded-[8px] bg-brand-50 px-3 text-sm font-extrabold text-brand-700">
                  {currentPage}
                </span>
                <button
                  type="button"
                  className="h-9 rounded-[8px] border border-border-subtle px-3 text-sm font-extrabold text-slate-600 disabled:opacity-50"
                  disabled={currentPage * pageSize >= totalCount}
                  onClick={() => handlePageChange(currentPage + 1, pageSize)}
                >
                  Next
                </button>
                <select
                  className="ui-input-base h-9 w-fit rounded-[8px] px-2 py-0 text-sm font-extrabold text-slate-600 shadow-none"
                  value={pageSize}
                  onChange={(event) => handlePageChange(1, Number(event.target.value))}
                >
                  <option value={10}>10 / p</option>
                  <option value={20}>20 / p</option>
                  <option value={50}>50 / p</option>
                </select>
              </div>
            </div>
          </div>

          {selectedOrder && (
            <>
              {/* Overlay Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
                onClick={() => setSelectedOrder(null)}
              ></div>

              {/* Sliding Drawer */}
              <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border-subtle bg-white shadow-2xl transition-transform duration-300">
                <div className="flex flex-wrap items-center justify-between border-b border-border-subtle bg-white px-5 py-4 gap-3">
                  <div>
                    <p className="m-0 text-xs font-extrabold uppercase text-slate-500">Order Details</p>
                    <h2 className="m-0 mt-1 text-xl font-extrabold text-slate-900">{getOrderKey(selectedOrder)}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => handleCallCustomer(selectedOrder)}
                    >
                      <FaPhone className="text-[10px]" /> Call
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 ml-1"
                      onClick={() => setSelectedOrder(null)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {detailsLoading ? (
                    <div className="py-10 text-center text-slate-500">Loading details...</div>
                  ) : (
                    <div className="grid gap-5">
                      <section className="grid gap-2">
                        <h3 className="m-0 text-sm font-extrabold text-slate-900">Customer</h3>
                        <div className="rounded-[8px] bg-slate-50 p-4 text-[15px] font-semibold text-slate-600">
                          <div className="font-extrabold text-slate-900">{selectedOrder.customer_name || "-"}</div>
                          <div className="mt-1">{selectedOrder.customer_phone || "-"}</div>
                          <div className="mt-1">{selectedOrder.customer_email || "-"}</div>
                        </div>
                      </section>

                      <section className="grid gap-2">
                        <h3 className="m-0 text-sm font-extrabold text-slate-900">Ordered Items</h3>
                        <div className="grid gap-3">
                          {selectedOrderItems.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="rounded-[8px] border border-border-subtle p-4">
                              <div className="flex items-start justify-between gap-3">
                                <strong className="text-[15px] text-slate-900">{item.name}</strong>
                                <span className="text-[15px] font-extrabold text-slate-700">x{item.quantity || "-"}</span>
                              </div>
                              {item.selectedAddons.length > 0 ? (
                                <p className="m-0 mt-1.5 text-sm font-semibold text-slate-500">
                                  Addons: {item.selectedAddons.map((addon) => addon.addon_name || addon.name || "Addon").join(", ")}
                                </p>
                              ) : null}
                              {item.notes ? <p className="m-0 mt-1.5 text-sm font-semibold text-slate-500">Note: {item.notes}</p> : null}
                              <p className="m-0 mt-3 text-right text-[15px] font-extrabold text-slate-900">
                                {item.lineTotal === "" ? "-" : formatCurrency(item.lineTotal, selectedOrder.currency_code)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="grid gap-2">
                        <h3 className="m-0 text-sm font-extrabold text-slate-900">Payment</h3>
                        <div className="rounded-[8px] bg-slate-50 p-4 text-[15px]">
                          <div className="flex justify-between gap-3 py-1"><span>Status</span><strong>{getPaymentLabel(selectedOrder)}</strong></div>
                          <div className="flex justify-between gap-3 py-1"><span>Method</span><strong>{humanizeValue(selectedOrder.payment_method)}</strong></div>
                          <div className="flex justify-between gap-3 py-1 mt-1 border-t border-slate-200 pt-2"><span>Total</span><strong className="text-brand-600">{formatCurrency(selectedOrder.total_amount, selectedOrder.currency_code)}</strong></div>
                          {selectedTransactionLines.length > 0 && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              {selectedTransactionLines.map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-3 py-1 text-sm">
                                  <span className="text-slate-500">{label}</span>
                                  <strong className="text-right text-slate-700">{value || "-"}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="grid gap-2">
                        <h3 className="m-0 text-sm font-extrabold text-slate-900">Delivery Address</h3>
                        <div className="rounded-[8px] bg-slate-50 p-4 text-[15px] font-semibold text-slate-600">
                          {selectedAddressLines.map((line, index) => (
                            <div key={`${line}-${index}`} className="py-0.5">{line}</div>
                          ))}
                        </div>
                      </section>

                      <section className="grid gap-2">
                        <h3 className="m-0 text-sm font-extrabold text-slate-900">Notes</h3>
                        <p className="m-0 rounded-[8px] bg-slate-50 p-4 text-[15px] font-semibold text-slate-600">
                          {selectedOrder.order_notes || "-"}
                        </p>
                      </section>

                      <section className="grid gap-2">
                        <h3 className="m-0 text-sm font-extrabold text-slate-900">Timeline</h3>
                        <div className="rounded-[8px] bg-slate-50 p-4 text-[15px] font-semibold text-slate-600">
                          <div className="py-0.5">Created: {formatDateTime(selectedOrder.created_at)}</div>
                          <div className="py-0.5">Updated: {formatDateTime(selectedOrder.updated_at)}</div>
                          <div className="py-0.5">Status: {humanizeValue(selectedOrder.order_status)}</div>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </aside>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Order;
