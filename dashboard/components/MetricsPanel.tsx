// MetricsPanel.tsx
// Right-column panel displaying live execution metrics: total orders, average
// orders per block, success rate, average latency, active epoch, active ticks,
// total volume, and an orders-per-block line chart. Uses Recharts with the
// light Apple-inspired palette — accent-blue for the line, neutral grays for
// axes and grid.

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MetricsPanelProps {
  ordersPerBlock: number[];
  totalOrders: number;
  totalVolume: string;
  avgLatency: number;
  successRate: number;
  activeEpoch: number;
  activeTicks: number;
}

/** Reusable stat card for a single metric value. */
function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-surface-secondary px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-content-tertiary">
        {label}
      </div>
      <div className="stat-value mt-1 flex items-baseline gap-1">
        <span
          className="text-xl font-semibold"
          style={{ color: color || "#1D1D1F" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-content-tertiary">{unit}</span>
        )}
      </div>
    </div>
  );
}

export default function MetricsPanel({
  ordersPerBlock,
  totalOrders,
  totalVolume,
  avgLatency,
  successRate,
  activeEpoch,
  activeTicks,
}: MetricsPanelProps) {
  const chartData = ordersPerBlock.map((count, i) => ({
    block: i + 1,
    orders: count,
  }));

  const formattedSuccessRate = Number.isFinite(successRate)
    ? successRate.toFixed(1)
    : "0.0";

  const formattedTotalVolume = parseFloat(totalVolume || "0").toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const averageOrdersPerBlock =
    ordersPerBlock.length > 0
      ? Math.round(
          ordersPerBlock.reduce((a, b) => a + b, 0) / ordersPerBlock.length
        )
      : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
          Execution Metrics
        </h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <StatCard
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          color="#0071E3" /* accent-blue */
        />
        <StatCard
          label="Orders/Block"
          value={averageOrdersPerBlock}
          unit="avg"
          color="#34C759" /* accent-green */
        />
        <StatCard
          label="Success Rate"
          value={formattedSuccessRate}
          unit="%"
          color="#34C759"
        />
        <StatCard
          label="Avg Latency"
          value={avgLatency}
          unit="ms"
          color={avgLatency < 500 ? "#34C759" : "#FF3B30"}
        />
        <StatCard label="Active Epoch" value={activeEpoch} />
        <StatCard
          label="Active Ticks"
          value={`${activeTicks}/20`}
          color="#0071E3"
        />
      </div>

      {/* Volume card (full width) */}
      <div className="px-3">
        <StatCard
          label="Total Volume"
          value={formattedTotalVolume}
          unit="MON"
          color="#0071E3"
        />
      </div>

      {/* Orders-per-block line chart */}
      <div className="flex-1 p-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-content-tertiary">
          Orders / Block
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E8E8ED" /* border-light */
                vertical={false}
              />
              <XAxis
                dataKey="block"
                stroke="#86868B"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="#86868B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D2D2D7",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif",
                }}
                labelStyle={{ color: "#6E6E73" }}
                itemStyle={{ color: "#0071E3" }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#0071E3" /* accent-blue */
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#34C759" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-content-secondary">
            Chart data will appear during load test
          </div>
        )}
      </div>
    </div>
  );
}
