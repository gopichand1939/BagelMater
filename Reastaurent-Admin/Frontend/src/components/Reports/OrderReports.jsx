import { useEffect, useMemo, useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "../ui";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import {
  DASHBOARD_CATEGORY_STATS,
  DASHBOARD_VEG_STATS,
  DASHBOARD_ORDER_STATS,
  ORDER_REPORTS_DASHBOARD,
} from "../../Utils/Constant";
import DashboardCharts from "../Dashboard/DashboardCharts";

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

const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];
const paymentColors = {
  paid: "#3b82f6",
  pending: "#10b981",
  failed: "#ef4444",
  refunded: "#f59e0b",
  unknown: "#64748b",
};

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

function ReportsSkeleton() {
  return (
    <div className="mt-[18px] grid gap-[24px]">
      {/* Category Distribution and Dietary Breakdown row */}
      <div className="grid gap-[18px] lg:grid-cols-2">
        <Card className="grid content-start gap-[20px]">
          <strong className="text-[1.1rem] text-text-strong">Category Distribution</strong>
          <PieChartSkeleton />
        </Card>
        <Card className="grid content-start gap-[20px]">
          <strong className="text-[1.1rem] text-text-strong">Dietary Breakdown</strong>
          <PieChartSkeleton />
        </Card>

        {/* Sales Chart (Bar) */}
        <Card className="col-span-full grid content-start gap-[20px]">
          <strong className="text-[1.1rem] text-text-strong">Sales Chart</strong>
          <div className="h-[320px] w-full flex items-end gap-6 justify-around px-8 pt-8">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="shimmer-block w-14 rounded-t-lg"
                style={{ height: idx === 0 ? "50%" : idx === 1 ? "30%" : "80%" }}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Daily Sales (Line) and Payment Analytics (Pie) row */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="grid min-h-[360px] gap-4">
          <h2 className="m-0 text-lg font-bold text-text-strong">Sales Chart</h2>
          <LineChartSkeleton />
        </Card>
        <Card className="grid min-h-[360px] gap-4">
          <h2 className="m-0 text-lg font-bold text-text-strong">Payment Analytics</h2>
          <PieChartSkeleton />
        </Card>
      </div>
    </div>
  );
}

function OrderReports() {
  const [loading, setLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState([]);
  const [vegStats, setVegStats] = useState([]);
  const [orderStats, setOrderStats] = useState({
    deliveredCount: 0,
    pendingCount: 0,
    todayCount: 0,
  });
  const [dailySales, setDailySales] = useState([]);
  const [payments, setPayments] = useState([]);

  const loadChartsData = async () => {
    setLoading(true);
    try {
      const fromDate = monthsAgo(4);
      const toDate = today();
      const reportsUrl = `${ORDER_REPORTS_DASHBOARD}?from_date=${fromDate}&to_date=${toDate}&limit=200`;

      const [ordersRes, categoriesRes, vegRes, reportsRes] = await Promise.all([
        fetchWithRefreshToken(DASHBOARD_ORDER_STATS, { method: "POST" }),
        fetchWithRefreshToken(DASHBOARD_CATEGORY_STATS, { method: "POST" }),
        fetchWithRefreshToken(DASHBOARD_VEG_STATS, { method: "POST" }),
        fetchWithRefreshToken(reportsUrl, { method: "GET" }),
      ]);

      const ordersData = await ordersRes.json();
      const categoriesData = await categoriesRes.json();
      const vegData = await vegRes.json();
      const reportsData = await reportsRes.json();

      if (ordersData.success) setOrderStats(ordersData.data);
      if (categoriesData.success) setCategoryStats(categoriesData.data);
      if (vegData.success) setVegStats(vegData.data);

      const payload = reportsData?.data || reportsData || {};
      if (Array.isArray(payload.dailySales)) {
        setDailySales(payload.dailySales);
      }
      if (payload.payments) {
        setPayments(normalizePaymentAnalytics(payload.payments));
      }
    } catch (error) {
      console.error("Failed to load dashboard charts data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChartsData();
  }, []);

  const barChartData = useMemo(() => [
    { name: "Today", count: orderStats.todayCount, fill: "#10b981" },
    { name: "Pending", count: orderStats.pendingCount, fill: "#f59e0b" },
    { name: "Delivered", count: orderStats.deliveredCount, fill: "#3b82f6" },
  ], [orderStats]);

  return (
    <div className="ui-page content-start">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-black uppercase tracking-[0.16em] text-brand-600">
            Reports
          </p>
          <h1 className="m-0 text-3xl font-bold text-text-strong">Order Reports Dashboard</h1>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-500 px-4 font-bold text-white shadow-[0_10px_22px_rgba(16,185,129,0.2)] transition hover:bg-brand-600"
          onClick={loadChartsData}
        >
          <LuRefreshCw size={18} />
          Refresh
        </button>
      </div>

      {loading ? (
        <ReportsSkeleton />
      ) : (
        <div className="mt-[18px] grid gap-[24px]">
          <DashboardCharts
            categoryStats={categoryStats}
            vegStats={vegStats}
            barChartData={barChartData}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="grid min-h-[360px] gap-4">
              <h2 className="m-0 text-lg font-bold text-text-strong">Sales Chart</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sales_date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={3} />
                  <Line type="monotone" dataKey="paid_amount" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="grid min-h-[360px] gap-4">
              <h2 className="m-0 text-lg font-bold text-text-strong">Payment Analytics</h2>
              {payments?.length > 0 ? (
                <div className="grid min-h-[280px] items-center gap-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1fr)]">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={payments}
                        dataKey="total_amount"
                        nameKey="payment_status"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="var(--color-surface-panel)"
                        strokeWidth={3}
                      >
                        {payments?.map((entry, index) => (
                          <Cell
                            key={`${entry.payment_status}-${entry.payment_method}`}
                            fill={paymentColors[entry.payment_status] || colors[index % colors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={28} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid content-center gap-2">
                    {payments?.map((payment, index) => (
                      <div
                        key={`${payment.payment_status}-${index}`}
                        className="grid grid-cols-[12px_minmax(0,1fr)] gap-2 rounded-lg border border-border-subtle p-3"
                      >
                        <span
                          className="mt-1 h-3 w-3 rounded-[3px]"
                          style={{ backgroundColor: paymentColors[payment.payment_status] || colors[index % colors.length] }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-black capitalize text-text-strong">
                              {payment.payment_status}
                            </span>
                            <span className="text-sm font-black text-text-strong">
                              {formatCurrency(payment.total_amount)}
                            </span>
                          </div>
                          <p className="m-0 mt-1 text-xs font-semibold text-text-muted">
                            {payment.total_orders} orders
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-[280px] items-center justify-center rounded-lg border border-border-subtle text-sm font-semibold text-text-muted">
                  No payment analytics available.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderReports;
