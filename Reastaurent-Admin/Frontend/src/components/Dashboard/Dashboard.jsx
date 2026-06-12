import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import {
  LuTrendingUp,
  LuTimer,
  LuLayers,
  LuPackage,
} from "react-icons/lu";
import { Card } from "../ui";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import {
  DASHBOARD_SUMMARY,
  DASHBOARD_CATEGORY_STATS,
  DASHBOARD_VEG_STATS,
  DASHBOARD_ORDER_STATS,
} from "../../Utils/Constant";

// Lazy load the charts component (heavy)
const DashboardCharts = lazy(() => import("./DashboardCharts"));
const DashboardReportsSection = lazy(() => import("./DashboardReportsSection"));

const accentClassMap = {
  success: "text-brand-600 bg-brand-500/15",
  warning: "text-accent-600 bg-accent-500/15",
  info: "text-sky-600 bg-sky-500/15",
  neutral: "text-violet-600 bg-violet-500/15",
};

function StatCard({ title, value, note, accent, loading, Icon }) {
  return (
    <Card className="grid gap-[10px]">
      <div
        className={`grid h-[42px] w-[42px] place-items-center rounded-xl ${accentClassMap[accent] || "bg-brand-500/15 text-brand-600"}`}
      >
        <Icon size={22} />
      </div>
      <span className="text-[0.9rem] font-bold text-text-muted">{title}</span>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded-md bg-surface-muted" />
      ) : (
        <strong className="text-[2rem] leading-none text-text-strong">{value}</strong>
      )}
      <span className="text-[0.95rem] text-text-base">{note}</span>
    </Card>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalItems: 0, totalCategories: 0 });
  const [orderStats, setOrderStats] = useState({
    deliveredCount: 0,
    pendingCount: 0,
    todayCount: 0,
  });
  const [categoryStats, setCategoryStats] = useState([]);
  const [vegStats, setVegStats] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [summaryRes, ordersRes, categoriesRes, vegRes] = await Promise.all([
          fetchWithRefreshToken(DASHBOARD_SUMMARY, { method: "POST" }),
          fetchWithRefreshToken(DASHBOARD_ORDER_STATS, { method: "POST" }),
          fetchWithRefreshToken(DASHBOARD_CATEGORY_STATS, { method: "POST" }),
          fetchWithRefreshToken(DASHBOARD_VEG_STATS, { method: "POST" }),
        ]);

        const summaryData = await summaryRes.json();
        const ordersData = await ordersRes.json();
        const categoriesData = await categoriesRes.json();
        const vegData = await vegRes.json();

        if (summaryData.success) setSummary(summaryData.data);
        if (ordersData.success) setOrderStats(ordersData.data);
        if (categoriesData.success) setCategoryStats(categoriesData.data);
        if (vegData.success) setVegStats(vegData.data);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  const barChartData = useMemo(() => [
    { name: "Today", count: orderStats.todayCount, fill: "#10b981" },
    { name: "Pending", count: orderStats.pendingCount, fill: "#f59e0b" },
    { name: "Delivered", count: orderStats.deliveredCount, fill: "#3b82f6" },
  ], [orderStats]);

  return (
    <div className="ui-page content-start">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]">
        <StatCard
          title="Daily Volume"
          value={orderStats.todayCount}
          note="Orders received today."
          accent="success"
          loading={loading}
          Icon={LuTrendingUp}
        />
        <StatCard
          title="Pending Orders"
          value={orderStats.pendingCount}
          note="Active orders in pipeline."
          accent="warning"
          loading={loading}
          Icon={LuTimer}
        />
        <StatCard
          title="Menu Categories"
          value={summary.totalCategories}
          note="Structured categories."
          accent="info"
          loading={loading}
          Icon={LuLayers}
        />
        <StatCard
          title="Total Items"
          value={summary.totalItems}
          note="Cataloged items."
          accent="neutral"
          loading={loading}
          Icon={LuPackage}
        />
      </section>

      {/* Heavy charts section lazy loaded */}
      <Suspense fallback={
        <div className="grid gap-[18px] lg:grid-cols-2 mt-[18px]">
          <Card className="h-[360px] animate-pulse bg-surface-muted/30" />
          <Card className="h-[360px] animate-pulse bg-surface-muted/30" />
          <Card className="col-span-full h-[380px] animate-pulse bg-surface-muted/30" />
        </div>
      }>
        {!loading && (
          <div className="mt-[18px]">
            <DashboardCharts 
              categoryStats={categoryStats} 
              vegStats={vegStats} 
              barChartData={barChartData} 
            />
          </div>
        )}
      </Suspense>

      <Suspense fallback={
        <div className="mt-[18px] grid gap-4">
          <Card className="h-[160px] animate-pulse bg-surface-muted/30" />
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="h-[360px] animate-pulse bg-surface-muted/30" />
            <Card className="h-[360px] animate-pulse bg-surface-muted/30" />
          </div>
        </div>
      }>
        <div className="mt-[18px]">
          <DashboardReportsSection />
        </div>
      </Suspense>
    </div>
  );
}

export default Dashboard;
