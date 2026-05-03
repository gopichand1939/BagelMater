import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ORDER_BY_ID,
  ORDER_LIST,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import StatusPill from "../common/StatusPill";
import Table from "../Table";
import ActionPopover from "../OrdersActionPopover";
import {
  setOrderData,
  setOrderSelectedItem,
} from "../../Redux/CardSlice";
import { subscribeToAdminRealtimeEvent, ADMIN_REALTIME_EVENT_TYPES } from "../../realtime/adminRealtimeEvents";

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

          ${
            transactionLines.length > 0
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

const renderMethodPill = (method = "") => {
  const normalizedMethod = String(method || "unknown").toLowerCase();
  const toneClassName =
    normalizedMethod === "stripe"
      ? "bg-sky-500/15 text-sky-300"
      : "bg-slate-800 text-slate-200";

  return (
    <span
      className={`inline-flex min-w-[108px] items-center justify-center rounded-full px-3 py-1.5 text-[0.8rem] font-bold ${toneClassName}`}
    >
      {normalizedMethod.replace(/_/g, " ")}
    </span>
  );
};

const renderPaymentFlowPill = (paymentStatus = "") => {
  const isPaid = String(paymentStatus || "").toLowerCase() === "paid";

  return (
    <span
      className={`inline-flex min-w-[132px] items-center justify-center rounded-full px-3 py-1.5 text-[0.8rem] font-bold ${
        isPaid
          ? "bg-green-500 text-white"
          : "bg-amber-900 text-amber-100"
      }`}
    >
      {isPaid ? "Payment Success" : "Order Pending"}
    </span>
  );
};

function Order() {
  const NEW_ORDER_HIGHLIGHT_MS = 30000;
  const hasSeenRealtimeConnectionRef = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState([]);

  const highlightOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    setHighlightedOrderIds((prev) => [...new Set([...prev, Number(orderId)])]);

    window.setTimeout(() => {
      setHighlightedOrderIds((prev) => prev.filter((value) => value !== Number(orderId)));
    }, NEW_ORDER_HIGHLIGHT_MS);
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
        body: JSON.stringify({ page, limit }),
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
  }, [currentPage, pageSize]);

  useEffect(() => {
    return subscribeToAdminRealtimeEvent(
      ADMIN_REALTIME_EVENT_TYPES.ORDER_UPDATED,
      (change) => {
        const targetOrderId = change?.orderId || change?.entityId || null;

        if (change?.action === "created" && targetOrderId) {
          highlightOrder(targetOrderId);
          applyRealtimeOrderChange(change);
          setCurrentPage(1);
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
  }, [currentPage, pageSize]);

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
  }, [currentPage, pageSize]);

  const handleRowAction = (rowData, target) => {
    dispatch(setOrderSelectedItem(rowData));
    navigate(target(rowData.id));
  };

  const handlePageChange = (page, nextPageSize) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  };

  const handleOpenActions = (event, rowData) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(rowData);
  };

  const handleCloseActions = () => {
    setAnchorEl(null);
    setSelectedRow(null);
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

  const headers = [
    { key: "id", label: "Id", width: "45px" },
    {
      key: "order_status",
      label: "Order Status",
      width: "95px",
      content: (item) => <StatusPill active={item.order_status !== "cancelled"} label={item.order_status} />,
    },
    {
      key: "order_number",
      label: "Order Number",
      width: "145px",
      content: (item) => renderCompactText(item.order_number, 18, "font-semibold"),
    },
    {
      key: "payment_flow",
      label: "Payment Flow",
      width: "145px",
      content: (item) => renderPaymentFlowPill(item.payment_status),
    },
    {
      key: "customer_name",
      label: "Customer Name",
      width: "170px",
      content: (item) => renderCompactText(item.customer_name, 22),
    },
    { key: "customer_phone", label: "Phone", width: "120px" },
    {
      key: "item_count",
      label: "Items",
      width: "70px",
    },
    {
      key: "ordered_items",
      label: "Ordered Items",
      width: "280px",
      content: (item) => {
        const orderedItems = parseOrderedItems(item.ordered_items);

        if (orderedItems.length === 0) {
          return <span className="text-sm text-slate-500">-</span>;
        }

        return (
          <div className="grid justify-items-start gap-1 text-left">
            {orderedItems.map((orderedItem, index) => (
              <span
                key={`${item.id}-ordered-item-${index}`}
                className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-brand-500/10 px-2.5 py-1 text-[0.75rem] font-semibold text-brand-600"
                title={orderedItem}
              >
                {orderedItem}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "payment_method",
      label: "Payment Method",
      width: "120px",
      content: (item) => renderMethodPill(item.payment_method),
    },
    {
      key: "subtotal_amount",
      label: "Subtotal",
      width: "110px",
      content: (item) => (
        <span className="font-semibold text-slate-800">
          {formatCurrency(item.subtotal_amount, item.currency_code)}
        </span>
      ),
    },
    {
      key: "discount_amount",
      label: "Discount",
      width: "110px",
      content: (item) => (
        <span className="font-semibold text-emerald-700">
          {formatCurrency(item.discount_amount, item.currency_code)}
        </span>
      ),
    },
    {
      key: "addon_amount",
      label: "Addons",
      width: "100px",
      content: (item) => (
        <span className="font-semibold text-slate-800">
          {formatCurrency(item.addon_amount, item.currency_code)}
        </span>
      ),
    },
    {
      key: "tax_amount",
      label: "Tax",
      width: "90px",
      content: (item) => (
        <span className="font-semibold text-slate-800">
          {formatCurrency(item.tax_amount, item.currency_code)}
        </span>
      ),
    },
    {
      key: "delivery_fee",
      label: "Delivery",
      width: "100px",
      content: (item) => (
        <span className="font-semibold text-slate-800">
          {formatCurrency(item.delivery_fee, item.currency_code)}
        </span>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      width: "110px",
      content: (item) => (
        <span className="font-semibold text-slate-800">
          {formatCurrency(item.total_amount, item.currency_code)}
        </span>
      ),
    },
    {
      key: "payment_status",
      label: "Payment Status",
      width: "95px",
      content: (item) => <StatusPill active={item.payment_status === "paid"} label={item.payment_status} />,
    },
    {
      key: "order_notes",
      label: "Order Notes",
      width: "180px",
      content: (item) => renderCompactText(item.order_notes || "-", 24),
    },
    {
      key: "created_at",
      label: "Created At",
      width: "150px",
      content: (item) => new Date(item.created_at).toLocaleString(),
    },
    {
      key: "updated_at",
      label: "Updated At",
      width: "150px",
      content: (item) => new Date(item.updated_at).toLocaleString(),
    },
    {
      key: "actions",
      label: "Actions",
      width: "70px",
      sticky: true,
      content: (rowData) => (
        <button
          type="button"
          className="h-9 w-9 rounded-[8px] border-0 bg-transparent text-[1.3rem] font-extrabold text-blue-600"
          onClick={(event) => handleOpenActions(event, rowData)}
        >
          ...
        </button>
      ),
    },
  ];

  return (
    <div className="grid min-h-0 content-start gap-2">
      <section className="min-h-0 overflow-hidden rounded-[8px] border border-border-subtle bg-surface-panel p-2">
        <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-3 px-1 pb-1">
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

        <Table
          data={data}
          headers={headers}
          loading={loading}
          searchPlaceholder="Search..."
          totalRowsLabel="Total Rows"
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          totalItems={totalCount}
          getRowClassName={(item) =>
            highlightedOrderIds.includes(Number(item.id))
              ? "shadow-[inset_0_0_0_2px_rgba(249,115,22,0.24)]"
              : ""
          }
          getRowCellClassName={(item) =>
            highlightedOrderIds.includes(Number(item.id))
              ? "bg-accent-500/10 animate-pulse"
              : "hover:bg-surface-hover"
          }
        />
      </section>

      <ActionPopover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        handleClose={handleCloseActions}
        selectedRow={selectedRow}
        onEdit={() => handleRowAction(selectedRow, (value) => `/editorder/${value}`)}
        onView={() => handleRowAction(selectedRow, (value) => `/vieworder/${value}`)}
        onDelete={() => handleRowAction(selectedRow, (value) => `/deleteorder/${value}`)}
        onPrint={handlePrintInvoice}
        hidePrint={String(selectedRow?.order_status || "").toLowerCase() !== "delivered"}
      />
    </div>
  );
}

export default Order;
