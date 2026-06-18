import { useEffect, useMemo, useState } from "react";
import { LuRefreshCw, LuSearch } from "react-icons/lu";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../ui";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { ORDER_REPORTS_DASHBOARD } from "../../Utils/Constant";

const paymentStatusOptions = ["", "paid", "pending", "failed", "refunded"];
const orderStatusOptions = [
  "",
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];
const paymentMethodOptions = [
  "",
  "cash_on_delivery",
  "stripe",
];

const formatFilterLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];
const paymentColors = {
  paid: "#3b82f6",
  pending: "#10b981",
  failed: "#ef4444",
  refunded: "#f59e0b",
  unknown: "#64748b",
};

const today = () => new Date().toISOString().slice(0, 10);
const monthsAgo = (count) => {
  const date = new Date();
  date.setMonth(date.getMonth() - count);
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatHourlyMetric = (value, name) =>
  String(name || "").toLowerCase().includes("sales")
    ? formatCurrency(value)
    : `${Number(value || 0)} delivered`;

const renderHourlyTick = (value) => {
  const label = String(value || "");
  const [start] = label.split(" - ");
  return start || label;
};

const buildUrl = (baseUrl, filters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  return `${baseUrl}?${params.toString()}`;
};

const getReportPayload = (responseData) => responseData?.data || responseData || {};

const normalizePaymentAnalytics = (paymentRows) => {
  if (!Array.isArray(paymentRows)) {
    return [];
  }

  const grouped = paymentRows.reduce((result, row) => {
    const status = row.payment_status || "unknown";
    const current = result[status] || {
      payment_status: status,
      payment_method: "",
      total_orders: 0,
      total_amount: 0,
      methods: [],
    };
    const method = row.payment_method || "-";

    return {
      ...result,
      [status]: {
        ...current,
        payment_method: current.payment_method || method,
        total_orders: current.total_orders + Number(row.total_orders || 0),
        total_amount: current.total_amount + Number(row.total_amount || 0),
        methods: current.methods.includes(method) ? current.methods : [...current.methods, method],
      },
    };
  }, {});

  return Object.values(grouped).filter((row) => row.total_amount > 0 || row.total_orders > 0);
};

function StatTile({ label, value, tone = "emerald" }) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${toneMap[tone] || toneMap.emerald}`}>
      <p className="m-0 text-sm font-bold opacity-80">{label}</p>
      <strong className="mt-2 block text-2xl leading-tight text-current">{value}</strong>
    </div>
  );
}

function PieChartSkeleton() {
  return (
    <div className="grid min-h-[280px] items-center gap-4 lg:grid-cols-[minmax(160px,0.72fr)_minmax(260px,1.08fr)]">
      <div className="relative flex justify-center py-4">
        {/* Outer Ring */}
        <div className="h-44 w-44 rounded-full border-[18px] border-border-subtle/50 relative flex items-center justify-center">
          <div className="absolute inset-[-18px] rounded-full border-[18px] border-transparent border-t-brand-500/20 animate-spin" style={{ animationDuration: "3s" }} />
          <div className="shimmer-block h-8 w-16" />
        </div>
      </div>
      <div className="grid max-h-[260px] content-start gap-2 overflow-y-auto pr-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[12px_minmax(0,1fr)] gap-2 rounded-lg border border-border-subtle p-3">
            <span className="mt-1 h-3 w-3 rounded-[3px] bg-slate-700/50" />
            <div className="min-w-0 flex flex-col gap-1.5">
              <div className="shimmer-block h-4 w-24" />
              <div className="shimmer-block h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChartSkeleton() {
  return (
    <div className="relative min-h-[280px] flex flex-col justify-between p-2">
      {/* Grid lines */}
      <div className="flex-1 flex flex-col justify-between py-4 border-l border-b border-border-subtle pr-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="w-full border-t border-dashed border-border-subtle/40 h-0 relative">
            {idx === 1 && (
              <svg className="absolute top-[-20px] left-0 w-full h-[60px] overflow-visible animate-pulse" preserveAspectRatio="none">
                <path
                  d="M0,40 Q60,10 120,30 T240,10 T360,40 T480,20 T600,30"
                  fill="none"
                  stroke="var(--color-primary-500)"
                  strokeWidth="2.5"
                  className="opacity-20"
                  strokeDasharray="4 4"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between pl-6 pt-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="shimmer-block h-3 w-10" />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <tr key={idx} className="border-b border-border-subtle">
          <td className="px-4 py-4"><div className="shimmer-block h-4 w-16" /></td>
          <td className="px-4 py-4"><div className="shimmer-block h-4 w-28" /></td>
          <td className="px-4 py-4"><div className="shimmer-block h-4 w-20" /></td>
          <td className="px-4 py-4"><div className="shimmer-block h-4 w-20" /></td>
          <td className="px-4 py-4"><div className="shimmer-block h-4 w-24" /></td>
          <td className="px-4 py-4 text-right"><div className="shimmer-block h-4 w-14 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

function StatusAnalyticsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-lg border border-border-subtle p-4 flex flex-col gap-2">
          <div className="shimmer-block h-3.5 w-20" />
          <div className="shimmer-block h-7 w-12 mt-1" />
          <div className="shimmer-block h-4.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function DashboardReportsSection() {
  const [filters, setFilters] = useState({
    from_date: monthsAgo(4),
    to_date: today(),
    payment_status: "",
    order_status: "",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryFilters = useMemo(
    () => ({
      ...filters,
      limit: "200",
    }),
    [filters]
  );

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchWithRefreshToken(buildUrl(ORDER_REPORTS_DASHBOARD, queryFilters));
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load reports");
      }

      const payload = getReportPayload(data);
      console.log("API RESPONSE", data);
      console.log("PAYMENTS", payload.payments || []);
      console.log("DAILY SALES", payload.dailySales || []);
      setReport(payload);
    } catch (requestError) {
      setError(requestError.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const summary = report?.summary || {};
  const orders = report?.orders || [];
  const displayedOrders = useMemo(
    () =>
      filters.payment_method
        ? orders.filter((order) => String(order.payment_method || "") === filters.payment_method)
        : orders,
    [filters.payment_method, orders]
  );
  const selectedMethodOrderCount = displayedOrders.length;
  const payments = normalizePaymentAnalytics(report?.payments);
  const topProducts = Array.isArray(report?.topProducts) ? report.topProducts : [];
  const topProductChartData = useMemo(
    () =>
      topProducts
        .map((product) => ({
          ...product,
          total_sales: Number(product.total_sales || 0),
          total_quantity: Number(product.total_quantity || 0),
        }))
        .filter((product) => product.total_quantity > 0)
        .sort((first, second) => second.total_quantity - first.total_quantity)
        .slice(0, 8),
    [topProducts]
  );
  const hourlySales = Array.isArray(report?.hourlySales) ? report.hourlySales : [];
  const dailySales = Array.isArray(report?.dailySales) ? report.dailySales : [];
  const statusAnalytics = Array.isArray(report?.statusAnalytics) ? report.statusAnalytics : [];

  return (
    <section className="grid gap-4">
      <Card className="grid gap-4" padding="sm">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 items-end">
          <label className="grid gap-1.5 text-xs font-bold text-text-muted">
            From Date
            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
              className="min-h-10 rounded-lg border border-border-subtle bg-white px-2.5 text-text-strong text-xs font-semibold w-full"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-text-muted">
            To Date
            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
              className="min-h-10 rounded-lg border border-border-subtle bg-white px-2.5 text-text-strong text-xs font-semibold w-full"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-text-muted">
            Payment Status
            <select
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
              className="min-h-10 rounded-lg border border-border-subtle bg-white px-2.5 text-text-strong text-xs font-semibold cursor-pointer w-full"
            >
              {paymentStatusOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-text-muted">
            Order Status
            <select
              name="order_status"
              value={filters.order_status}
              onChange={handleFilterChange}
              className="min-h-10 rounded-lg border border-border-subtle bg-white px-2.5 text-text-strong text-xs font-semibold cursor-pointer w-full"
            >
              {orderStatusOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-text-muted">
            Method
            <select
              name="payment_method"
              value={filters.payment_method}
              onChange={handleFilterChange}
              className="min-h-10 rounded-lg border border-border-subtle bg-white px-2.5 text-text-strong text-xs font-semibold cursor-pointer w-full"
            >
              {paymentMethodOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option ? formatFilterLabel(option) : "All"}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-brand-600 transition cursor-pointer w-full"
            onClick={loadReport}
          >
            <LuSearch size={14} />
            Apply
          </button>

          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-brand-600 transition cursor-pointer w-full"
            onClick={loadReport}
          >
            <LuRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </Card>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total Orders" value={loading ? <div className="shimmer-block h-8 w-16" /> : summary.total_orders || 0} />
        <StatTile label="Revenue" value={loading ? <div className="shimmer-block h-8 w-32" /> : formatCurrency(summary.total_revenue)} tone="blue" />
        <StatTile label="COD Pending" value={loading ? <div className="shimmer-block h-8 w-28" /> : formatCurrency(summary.cod_pending_amount)} tone="amber" />
        <StatTile label="Paid Amount" value={loading ? <div className="shimmer-block h-8 w-28" /> : formatCurrency(summary.paid_amount)} />
        <StatTile label="Delivered" value={loading ? <div className="shimmer-block h-8 w-16" /> : summary.total_delivered || 0} tone="blue" />
        <StatTile label="Cancelled" value={loading ? <div className="shimmer-block h-8 w-16" /> : summary.total_cancelled || 0} tone="rose" />
        <StatTile label="Average Order Value" value={loading ? <div className="shimmer-block h-8 w-24" /> : formatCurrency(summary.average_order_value)} />
        <StatTile label="Total Tax" value={loading ? <div className="shimmer-block h-8 w-20" /> : formatCurrency(summary.total_tax_collected)} tone="blue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">

        <Card className="grid min-h-[360px] gap-4">
          <h3 className="m-0 text-lg font-bold text-text-strong">Top Products</h3>
          {loading ? (
            <PieChartSkeleton />
          ) : topProductChartData.length > 0 ? (
            <div className="grid min-h-[280px] items-center gap-4 lg:grid-cols-[minmax(160px,0.72fr)_minmax(260px,1.08fr)]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={topProductChartData}
                    dataKey="total_quantity"
                    nameKey="item_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={3}
                    stroke="var(--color-surface-panel)"
                    strokeWidth={3}
                  >
                    {topProductChartData.map((entry, index) => (
                      <Cell
                        key={`${entry.item_name}-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} sold`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid max-h-[260px] content-start gap-2 overflow-y-auto pr-1">
                {topProductChartData.map((product, index) => (
                  <div
                    key={`${product.item_name}-${index}`}
                    className="grid grid-cols-[12px_minmax(0,1fr)] gap-2 rounded-lg border border-border-subtle p-3"
                  >
                    <span
                      className="mt-1 h-3 w-3 rounded-[3px]"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-text-strong">
                          {product.item_name}
                        </span>
                        <span className="text-sm font-black text-text-strong">
                          {product.total_quantity} sold
                        </span>
                      </div>
                      <p className="m-0 mt-1 text-xs font-semibold text-text-muted">
                        Revenue: {formatCurrency(product.total_sales)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-border-subtle text-sm font-semibold text-text-muted">
              No top product analytics available.
            </div>
          )}
        </Card>

        <Card className="grid min-h-[360px] gap-4">
          <h3 className="m-0 text-lg font-bold text-text-strong">Hourly Sales Analytics</h3>
          {loading ? (
            <LineChartSkeleton />
          ) : hourlySales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={hourlySales} margin={{ top: 12, right: 18, left: 6, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour_label" tickFormatter={renderHourlyTick} minTickGap={18} />
                <YAxis yAxisId="sales" tickFormatter={(value) => formatCurrency(value)} width={74} />
                <YAxis yAxisId="orders" orientation="right" allowDecimals={false} width={44} />
                <Tooltip formatter={formatHourlyMetric} />
                <Legend />
                <Line
                  yAxisId="sales"
                  type="monotone"
                  dataKey="total_sales"
                  name="Hourly sales"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="delivered_orders"
                  name="Delivered orders"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-border-subtle text-sm font-semibold text-text-muted">
              No hourly sales analytics available.
            </div>
          )}
        </Card>
      </section>

      <Card className="grid gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h3 className="m-0 text-lg font-bold text-text-strong">Orders Table</h3>
            <div className="text-sm font-semibold text-text-muted">
              Peak: {loading ? "..." : summary.peak_sales_hour || "-"} - Top Product: {loading ? "..." : summary.top_selling_product || "-"}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="rounded-lg border border-border-subtle bg-surface-panel px-3 py-2 text-sm font-semibold text-text-muted">
              {filters.payment_method ? `${formatFilterLabel(filters.payment_method)} Orders` : "Total Orders"}
              <span className="ml-2 font-black text-text-strong">{loading ? "..." : selectedMethodOrderCount}</span>
            </div>
            <label className="grid gap-1 text-sm font-bold text-text-muted">
              Method Filter
              <select
                name="payment_method"
                disabled={loading}
                value={filters.payment_method}
                onChange={handleFilterChange}
                className="min-h-10 min-w-[220px] rounded-lg border border-border-subtle bg-white px-3 text-text-strong disabled:opacity-50"
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option || "all-table"} value={option}>
                    {option ? formatFilterLabel(option) : "All Methods"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_var(--color-border-subtle)]">
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                {/*
                <th className="px-4 py-3">Items</th>
                */}
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : (
                displayedOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border-subtle">
                    <td className="px-4 py-3 font-bold text-text-strong">{order.order_number}</td>
                    <td className="px-4 py-3 text-text-base">{order.customer_name}</td>
                    {/*
                    <td className="max-w-[280px] truncate px-4 py-3 text-text-muted">{order.ordered_items}</td>
                    */}
                    <td className="px-4 py-3 text-text-base">{order.order_status}</td>
                    <td className="px-4 py-3 text-text-base">{order.payment_status}</td>
                    <td className="px-4 py-3 text-text-base">{order.payment_method}</td>
                    <td className="px-4 py-3 text-right font-bold text-text-strong">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                ))
              )}
              {!loading && displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center font-semibold text-text-muted">
                    No orders found for this report range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="grid gap-4">
        <h3 className="m-0 text-lg font-bold text-text-strong">Order Status Analytics</h3>
        {loading ? (
          <StatusAnalyticsSkeleton />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statusAnalytics.map((status) => (
              <div key={status.order_status} className="rounded-lg border border-border-subtle p-4">
                <p className="m-0 text-sm font-bold capitalize text-text-muted">{status.order_status}</p>
                <strong className="mt-2 block text-2xl text-text-strong">{status.total_orders}</strong>
                <span className="text-sm font-semibold text-brand-600">{formatCurrency(status.total_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

export default DashboardReportsSection;
