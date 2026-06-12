import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "../ui";

const COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#ec4899", // pink
];

const DIET_COLORS = {
  Vegan: "#10b981",
  Halal: "#f43f5e",
  "Not Applicable": "#64748b",
};

const DashboardCharts = ({ categoryStats, vegStats, barChartData }) => {
  const categoryTotal = categoryStats.reduce(
    (total, entry) => total + Number(entry.item_count || 0),
    0
  );
  const displayCategoryStats = [...categoryStats].sort(
    (first, second) => Number(second.item_count || 0) - Number(first.item_count || 0)
  );
  const displayVegStats = vegStats.map((entry) => ({
    ...entry,
    type:
      entry.type === "Veg"
        ? "Vegan"
        : entry.type === "Non-Veg"
          ? "Halal"
          : entry.type === "Not applicable"
            ? "Not Applicable"
            : entry.type,
  }));

  return (
    <section className="grid gap-[18px] lg:grid-cols-2">
      <Card className="grid content-start gap-[20px]">
        <strong className="text-[1.1rem] text-text-strong">Category Distribution</strong>
        <div className="min-h-[300px] w-full">
          {categoryStats.length > 0 ? (
            <div className="grid min-h-[300px] items-center gap-5 xl:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1.1fr)]">
              <div className="relative h-[240px] min-w-0 sm:h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={displayCategoryStats}
                      dataKey="item_count"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="78%"
                      paddingAngle={2}
                      stroke="var(--color-surface-panel)"
                      strokeWidth={3}
                    >
                      {displayCategoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} item${Number(value) === 1 ? "" : "s"}`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "var(--color-surface-panel)",
                        borderColor: "var(--color-border-subtle)",
                        borderRadius: "12px",
                        color: "var(--color-text-base)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <span className="block text-[1.6rem] font-black leading-none text-text-strong">
                      {categoryTotal}
                    </span>
                    <span className="mt-1 block text-[0.75rem] font-bold uppercase text-text-muted">
                      Items
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid max-h-[270px] min-w-0 content-start gap-2 overflow-y-auto pr-1">
                {displayCategoryStats.map((entry, index) => {
                  const itemCount = Number(entry.item_count || 0);
                  const percent = categoryTotal ? Math.round((itemCount / categoryTotal) * 100) : 0;
                  const color = COLORS[index % COLORS.length];

                  return (
                    <div
                      key={entry.category_name || index}
                      className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 rounded-[8px] px-2 py-1.5"
                    >
                      <span
                        className="h-3 w-3 rounded-[3px]"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate text-[0.88rem] font-bold text-text-strong">
                        {entry.category_name}
                      </span>
                      <span className="text-[0.82rem] font-black text-text-muted">
                        {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted">
              No data available
            </div>
          )}
        </div>
      </Card>

      <Card className="grid content-start gap-[20px]">
        <strong className="text-[1.1rem] text-text-strong">Dietary Breakdown</strong>
        <div className="h-[300px] w-full">
          {displayVegStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayVegStats}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                >
                  {displayVegStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DIET_COLORS[entry.type] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-panel)",
                    borderColor: "var(--color-border-subtle)",
                    borderRadius: "12px",
                    color: "var(--color-text-base)",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted">
              No data available
            </div>
          )}
        </div>
      </Card>

      <Card className="col-span-full grid content-start gap-[20px]">
        <strong className="text-[1.1rem] text-text-strong">Order Pipeline Overview</strong>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-surface-muted)", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "var(--color-surface-panel)",
                  borderColor: "var(--color-border-subtle)",
                  borderRadius: "12px",
                  color: "var(--color-text-base)",
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
};

export default DashboardCharts;
