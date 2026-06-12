import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  LuCalendar,
  LuCreditCard,
  LuEye,
  LuRefreshCw,
  LuSearch,
  LuSlidersHorizontal,
} from "react-icons/lu";
import { PAYMENT_LIST } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { setPaymentData, setPaymentSelectedItem } from "../../Redux/CardSlice";
import {
  subscribeToAdminRealtimeEvent,
  ADMIN_REALTIME_EVENT_TYPES,
} from "../../realtime/adminRealtimeEvents";
import ActionPopover from "../ActionPopover";
import { Button, Card } from "../ui";

const NEW_PAYMENT_HIGHLIGHT_MS = 30000;

const initialFilters = {
  search: "",
  from_date: "",
  to_date: "",
  status: "",
  gateway: "",
  payment_method: "",
  currency_code: "",
  amount_range: "",
  is_payment_success: "",
};

const amountRanges = [
  { value: "", label: "Any amount" },
  { value: "0-100", label: "Up to 100" },
  { value: "100-500", label: "100 to 500" },
  { value: "500-1000", label: "500 to 1,000" },
  { value: "1000+", label: "Above 1,000" },
];

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

const formatPaymentDate = (value) => {
  if (!value) {
    return { date: "-", time: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: value, time: "" };
  }

  return {
    date: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const formatLabel = (value) =>
  String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const truncateValue = (value, maxLength = 28) => {
  const normalized = value === null || value === undefined || value === "" ? "-" : String(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const getInitials = (name) => {
  const parts = String(name || "Customer").trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
};

const getPaymentStatus = (payment) => {
  if (Number(payment?.is_payment_success) === 1) {
    return { label: "Succeeded", tone: "success" };
  }

  const status = String(payment?.status || "").toLowerCase();

  if (status.includes("fail")) {
    return { label: "Failed", tone: "danger" };
  }

  return { label: "Pending", tone: "warning" };
};

const statusClassMap = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
};

const matchesAmountRange = (amount, range) => {
  const numericAmount = Number(amount || 0);

  if (!range) return true;
  if (range === "1000+") return numericAmount >= 1000;

  const [minimum, maximum] = range.split("-").map(Number);
  return numericAmount >= minimum && numericAmount < maximum;
};

const isInDateRange = (value, fromDate, toDate) => {
  if (!fromDate && !toDate) return true;
  if (!value) return false;

  const paymentDate = new Date(value);

  if (Number.isNaN(paymentDate.getTime())) return false;

  const paymentDay = paymentDate.toISOString().slice(0, 10);
  if (fromDate && paymentDay < fromDate) return false;
  if (toDate && paymentDay > toDate) return false;
  return true;
};

const getUniqueOptions = (data, key) =>
  [...new Set(data.map((item) => String(item?.[key] || "").trim()).filter(Boolean))].sort();

function SummaryCard({ icon: Icon, label, value, note, tone }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-[8px] ${toneMap[tone] || toneMap.blue}`}>
          <Icon size={24} />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-sm font-bold text-text-muted">{label}</p>
          <strong className="mt-1 block text-2xl leading-none text-text-strong">{value}</strong>
        </div>
      </div>
      <span className="text-xs font-semibold text-text-muted">{note}</span>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.08em] text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm font-bold text-text-strong shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Payment() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [highlightedPaymentIds, setHighlightedPaymentIds] = useState([]);
  const [filters, setFilters] = useState(initialFilters);

  const highlightPayment = (paymentId) => {
    if (!paymentId) return;

    setHighlightedPaymentIds((prev) => [...new Set([...prev, Number(paymentId)])]);

    window.setTimeout(() => {
      setHighlightedPaymentIds((prev) => prev.filter((value) => value !== Number(paymentId)));
    }, NEW_PAYMENT_HIGHLIGHT_MS);
  };

  const fetchPayments = async (page = 1, limit = 10, activeFilters = filters) => {
    setLoading(true);

    try {
      const response = await fetchWithRefreshToken(PAYMENT_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page,
          limit,
          status: activeFilters.status,
          gateway: activeFilters.gateway,
          is_payment_success: activeFilters.is_payment_success,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch payments");
      }

      const payments = Array.isArray(responseData.data) ? responseData.data : [];
      setData(payments);
      setTotalCount(responseData.pagination?.totalRecords || 0);
      dispatch(setPaymentData(payments));
    } catch (error) {
      toast.error(error.message || "Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(currentPage, pageSize, filters);
  }, [currentPage, pageSize, filters.status, filters.gateway, filters.is_payment_success]);

  useEffect(() => {
    return subscribeToAdminRealtimeEvent(
      ADMIN_REALTIME_EVENT_TYPES.PAYMENT_UPDATED,
      (change) => {
        const targetPaymentId =
          change?.paymentId || change?.entityId || change?.entityData?.id || null;

        if (targetPaymentId) {
          highlightPayment(targetPaymentId);
        }

        fetchPayments(currentPage, pageSize, filters);
      }
    );
  }, [currentPage, pageSize, filters]);

  const gatewayOptions = useMemo(() => getUniqueOptions(data, "gateway"), [data]);
  const methodOptions = useMemo(() => getUniqueOptions(data, "payment_method"), [data]);
  const currencyOptions = useMemo(() => getUniqueOptions(data, "currency_code"), [data]);

  const filteredData = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();

    return data.filter((payment) => {
      const searchableText = [
        payment.order_number,
        payment.transaction_id,
        payment.rrn,
        payment.customer_name,
        payment.customer_email,
        payment.customer_phone,
      ]
        .join(" ")
        .toLowerCase();

      if (searchText && !searchableText.includes(searchText)) return false;
      if (filters.payment_method && payment.payment_method !== filters.payment_method) return false;
      if (filters.currency_code && payment.currency_code !== filters.currency_code) return false;
      if (!matchesAmountRange(payment.amount, filters.amount_range)) return false;
      if (!isInDateRange(payment.paid_at || payment.created_at, filters.from_date, filters.to_date)) return false;

      return true;
    });
  }, [data, filters]);

  const summary = useMemo(() => {
    const successful = data.filter((payment) => Number(payment.is_payment_success) === 1);
    const failed = data.filter((payment) => String(payment.status || "").toLowerCase().includes("fail"));
    const revenue = successful.reduce((total, payment) => total + Number(payment.amount || 0), 0);

    return {
      total: totalCount,
      successful: successful.length,
      failed: failed.length,
      revenue,
    };
  }, [data, totalCount]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (filters.status) chips.push({ key: "status", label: `Status: ${formatLabel(filters.status)}` });
    if (filters.gateway) chips.push({ key: "gateway", label: `Gateway: ${formatLabel(filters.gateway)}` });
    if (filters.payment_method) chips.push({ key: "payment_method", label: `Method: ${formatLabel(filters.payment_method)}` });
    if (filters.currency_code) chips.push({ key: "currency_code", label: `Currency: ${filters.currency_code}` });
    if (filters.amount_range) chips.push({ key: "amount_range", label: `Amount: ${amountRanges.find((item) => item.value === filters.amount_range)?.label}` });
    if (filters.is_payment_success) chips.push({ key: "is_payment_success", label: filters.is_payment_success === "1" ? "Result: Success" : "Result: Failed" });
    if (filters.from_date || filters.to_date) chips.push({ key: "dates", label: `Dates: ${filters.from_date || "Start"} to ${filters.to_date || "Today"}` });

    return chips;
  }, [filters]);

  const updateFilter = (key, value) => {
    if (["status", "gateway", "is_payment_success"].includes(key)) {
      setCurrentPage(1);
    }

    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilter = (key) => {
    if (key === "dates") {
      setFilters((prev) => ({ ...prev, from_date: "", to_date: "" }));
      return;
    }

    updateFilter(key, "");
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setFilters(initialFilters);
  };

  const handleOpenActions = (event, rowData) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(rowData);
  };

  const handleCloseActions = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleViewPayment = (rowData) => {
    dispatch(setPaymentSelectedItem(rowData));
    navigate(`/viewpayment/${rowData.id}`);
  };

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
  };

  return (
    <div className="grid min-h-0 content-start gap-[18px]">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <p className="m-0 text-sm font-black uppercase tracking-[0.16em] text-orange-500">
              Finance
            </p>
            <h2 className="m-0 text-[clamp(2rem,3vw,2.8rem)] leading-none text-text-strong">
              Payments
            </h2>
            <span className="text-sm font-semibold text-text-muted">
              View and manage customer payment transactions.
            </span>
          </div>
          <div className="flex items-center gap-[10px] font-semibold text-slate-500">
            <span>Home</span>
            <span>/</span>
            <strong className="text-brand-500">Payments</strong>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={LuCreditCard}
            label="Total Payments"
            value={summary.total}
            note="All matching backend records"
            tone="blue"
          />
          <SummaryCard
            icon={() => <span className="text-sm font-black leading-none">OK</span>}
            label="Successful"
            value={summary.successful}
            note="Successful payments on this page"
            tone="emerald"
          />
          <SummaryCard
            icon={() => <span className="text-xl font-black leading-none">X</span>}
            label="Failed"
            value={summary.failed}
            note="Failed payments on this page"
            tone="rose"
          />
          <SummaryCard
            icon={LuCreditCard}
            label="Page Revenue"
            value={formatCurrency(summary.revenue)}
            note="Successful amount on this page"
            tone="amber"
          />
        </section>

        <Card className="grid gap-4 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto_auto]">
            <label className="relative block">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search by order, transaction ID, RRN, customer, email or phone..."
                className="min-h-11 w-full rounded-lg border border-border-subtle bg-white pl-10 pr-3 text-sm font-semibold text-text-strong shadow-sm outline-none transition placeholder:text-text-muted focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
              />
            </label>

            <div className="grid min-w-[260px] grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 shadow-sm">
              <LuCalendar className="text-text-muted" size={18} />
              <input
                type="date"
                placeholder="DD-MM-YYYY"
                value={filters.from_date}
                onChange={(event) => updateFilter("from_date", event.target.value)}
                className="min-h-11 min-w-0 border-0 bg-transparent text-sm font-bold uppercase text-text-strong outline-none placeholder:uppercase"
              />
              <input
                type="date"
                placeholder="DD-MM-YYYY"
                value={filters.to_date}
                onChange={(event) => updateFilter("to_date", event.target.value)}
                className="min-h-11 min-w-0 border-0 bg-transparent text-sm font-bold uppercase text-text-strong outline-none placeholder:uppercase"
              />
            </div>

            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 text-sm font-black text-text-strong shadow-sm"
            >
              <LuSlidersHorizontal size={18} />
              Advanced Filters
              {activeFilterChips.length ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-100 px-1 text-xs text-brand-700">
                  {activeFilterChips.length}
                </span>
              ) : null}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(140px,1fr))_auto]">
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => updateFilter("status", value)}
              options={[
                { value: "", label: "All statuses" },
                { value: "succeeded", label: "Succeeded" },
                { value: "failed", label: "Failed" },
                { value: "pending", label: "Pending" },
              ]}
            />
            <FilterSelect
              label="Gateway"
              value={filters.gateway}
              onChange={(value) => updateFilter("gateway", value)}
              options={[
                { value: "", label: "All gateways" },
                ...gatewayOptions.map((option) => ({ value: option, label: formatLabel(option) })),
              ]}
            />
            <FilterSelect
              label="Payment Method"
              value={filters.payment_method}
              onChange={(value) => updateFilter("payment_method", value)}
              options={[
                { value: "", label: "All methods" },
                ...methodOptions.map((option) => ({ value: option, label: formatLabel(option) })),
              ]}
            />
            <FilterSelect
              label="Currency"
              value={filters.currency_code}
              onChange={(value) => updateFilter("currency_code", value)}
              options={[
                { value: "", label: "All currencies" },
                ...currencyOptions.map((option) => ({ value: option, label: option })),
              ]}
            />
            <FilterSelect
              label="Amount Range"
              value={filters.amount_range}
              onChange={(value) => updateFilter("amount_range", value)}
              options={amountRanges}
            />
            <button
              type="button"
              onClick={handleResetFilters}
              className="self-end justify-self-start text-sm font-black text-brand-600 hover:text-brand-700 xl:justify-self-center"
            >
              <span className="inline-flex min-h-11 items-center gap-2">
                <LuRefreshCw size={16} />
                Reset
              </span>
            </button>
          </div>

          {activeFilterChips.length ? (
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => clearFilter(chip.key)}
                  className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-black text-blue-700"
                >
                  {chip.label}
                  <span className="text-base leading-none">x</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex min-h-8 items-center px-2 text-xs font-black text-brand-600"
              >
                Clear all
              </button>
            </div>
          ) : null}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[1020px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_var(--color-border-subtle)]">
                <tr className="text-xs font-black uppercase tracking-[0.06em] text-text-muted">
                  <th className="px-4 py-4">Payment Info</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Method</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Date & Time</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-14 text-center font-semibold text-text-muted">
                      Loading payments...
                    </td>
                  </tr>
                ) : filteredData.length ? (
                  filteredData.map((payment) => {
                    const status = getPaymentStatus(payment);
                    const paymentDate = formatPaymentDate(payment.paid_at || payment.created_at);
                    const isHighlighted = highlightedPaymentIds.includes(Number(payment.id));

                    return (
                      <tr
                        key={payment.id}
                        className={`border-b border-border-subtle transition-colors ${
                          isHighlighted ? "bg-sky-50" : "bg-white hover:bg-surface-muted/40"
                        }`}
                      >
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleViewPayment(payment)}
                            className="block text-left text-sm font-black text-blue-600 hover:text-blue-700"
                          >
                            {payment.order_number || "-"}
                          </button>
                          <p className="m-0 mt-1 text-xs font-semibold text-text-muted">
                            Txn ID: <span title={payment.transaction_id}>{truncateValue(payment.transaction_id, 34)}</span>
                          </p>
                          <p className="m-0 mt-1 text-xs font-black text-text-strong">
                            RRN: <span title={payment.rrn}>{truncateValue(payment.rrn, 30)}</span>
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">
                              {getInitials(payment.customer_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="m-0 text-sm font-black text-text-strong">{payment.customer_name || "-"}</p>
                              <p className="m-0 mt-1 max-w-[220px] truncate text-xs font-semibold text-text-muted" title={payment.customer_email}>
                                {payment.customer_email || "-"}
                              </p>
                              <p className="m-0 mt-1 text-xs font-semibold text-text-muted">{payment.customer_phone || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="m-0 text-sm font-black text-text-strong">
                            {formatCurrency(payment.amount, payment.currency_code)}
                          </p>
                          <p className="m-0 mt-1 text-xs font-semibold text-text-muted">{payment.currency_code || "-"}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-2">
                            <span className="grid h-7 min-w-9 place-items-center rounded bg-blue-900 px-2 text-[0.62rem] font-black text-white">
                              VISA
                            </span>
                            <div>
                              <p className="m-0 text-sm font-black text-text-strong">{formatLabel(payment.payment_method)}</p>
                              <p className="m-0 mt-1 text-xs font-semibold text-text-muted">{formatLabel(payment.gateway)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={`inline-flex min-h-8 min-w-[108px] items-center justify-center gap-1 rounded-md px-3 text-xs font-black ring-1 ${statusClassMap[status.tone]}`}>
                            <span className="text-xs font-black leading-none">{status.tone === "danger" ? "X" : "OK"}</span>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="m-0 text-sm font-black text-text-strong">{paymentDate.date}</p>
                          <p className="m-0 mt-1 text-xs font-semibold text-text-muted">{paymentDate.time}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewPayment(payment)}
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 text-sm font-black text-text-strong hover:bg-surface-muted"
                            >
                              <LuEye size={16} />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={(event) => handleOpenActions(event, payment)}
                              className="grid h-9 w-9 place-items-center rounded-lg border border-border-subtle bg-white text-text-strong hover:bg-surface-muted"
                            >
                              <span className="text-lg font-black leading-none">...</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-14 text-center font-semibold text-text-muted">
                      No payments found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
            <span className="text-sm font-bold text-text-muted">
              Showing {filteredData.length ? 1 : 0} to {filteredData.length} of {totalCount} results
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-text-muted">Rows per page</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="min-h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm font-bold text-text-strong"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Prev
              </Button>
              <span className="grid h-9 min-w-9 place-items-center rounded-lg border border-blue-200 bg-blue-50 px-2 text-sm font-black text-blue-700">
                {currentPage}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage * pageSize >= totalCount}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <ActionPopover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        handleClose={handleCloseActions}
        selectedRow={selectedRow}
        hideEdit
        hideDelete
        onView={() => handleViewPayment(selectedRow)}
      />
    </div>
  );
}

export default Payment;
