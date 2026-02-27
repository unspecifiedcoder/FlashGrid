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
    <div className="rounded-lg border border-monad-border bg-monad-card/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-monad-text">
        {label}
      </div>
      <div className="stat-value mt-1 flex items-baseline gap-1">
        <span
          className="text-xl font-bold"
          style={{ color: color || "#e2e0ea" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-monad-text">{unit}</span>
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

  const avgOrders =
    ordersPerBlock.length > 0
      ? Math.round(
          ordersPerBlock.reduce((a, b) => a + b, 0) / ordersPerBlock.length
        )
      : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-monad-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Execution Metrics
        </h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <StatCard
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          color="#836EF9"
        />
        <StatCard
          label="Orders/Block"
          value={avgOrders}
          unit="avg"
          color="#00E5A0"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}`}
          unit="%"
          color="#00E5A0"
        />
        <StatCard
          label="Avg Latency"
          value={avgLatency}
          unit="ms"
          color={avgLatency < 500 ? "#00E5A0" : "#FF6B6B"}
        />
        <StatCard label="Active Epoch" value={activeEpoch} />
        <StatCard
          label="Active Ticks"
          value={`${activeTicks}/20`}
          color="#836EF9"
        />
      </div>

      {/* Volume */}
      <div className="px-3">
        <StatCard
          label="Total Volume"
          value={parseFloat(totalVolume).toFixed(2)}
          unit="MON"
          color="#836EF9"
        />
      </div>

      {/* Orders per block chart */}
      <div className="flex-1 p-3">
        <div className="text-[10px] uppercase tracking-widest text-monad-text mb-2">
          Orders / Block
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2440"
                vertical={false}
              />
              <XAxis
                dataKey="block"
                stroke="#A89EC8"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="#A89EC8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#141024",
                  border: "1px solid #2A2440",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                labelStyle={{ color: "#A89EC8" }}
                itemStyle={{ color: "#00E5A0" }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#836EF9"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#00E5A0" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-monad-text">
            Chart data will appear during load test
          </div>
        )}
      </div>
    </div>
  );
}
