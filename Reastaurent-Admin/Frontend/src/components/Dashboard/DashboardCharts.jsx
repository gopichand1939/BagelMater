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
  Veg: "#10b981",
  "Non-Veg": "#f43f5e",
  "Both / N/A": "#64748b",
};

const DashboardCharts = ({ categoryStats, vegStats, barChartData }) => {
  const displayVegStats = vegStats.map((entry) => ({
    ...entry,
    type:
      entry.type === "Veg"
        ? "Veg"
        : entry.type === "Both / Not applicable"
          ? "Both / N/A"
          : entry.type,
  }));

  return (
    <section className="grid gap-[18px] lg:grid-cols-2">
      <Card className="grid content-start gap-[20px]">
        <strong className="text-[1.1rem] text-text-strong">Category Distribution</strong>
        <div className="h-[300px] w-full">
          {categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  dataKey="item_count"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              </PieChart>
            </ResponsiveContainer>
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
