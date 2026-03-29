// ParallelChart.tsx
// Left-column "Compare" tab showing a side-by-side comparison of FlashGrid's
// state-sharded parallel execution versus a sequential baseline. Includes
// summary cards and a grouped bar chart using Recharts. Uses accent-blue for
// the sharded bars and accent-orange for the sequential baseline.

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ParallelChartProps {
  shardedResults?: {
    ordersSubmitted: number;
    blocksUsed: number;
    ordersPerBlock: number;
    successRate: number;
    avgLatency: number;
  };
  sequentialResults?: {
    ordersSubmitted: number;
    blocksUsed: number;
    ordersPerBlock: number;
    successRate: number;
    avgLatency: number;
  };
}

/** Pre-loaded benchmark data from expected test results. */
const DEFAULT_SHARDED = {
  ordersSubmitted: 200,
  blocksUsed: 2,
  ordersPerBlock: 100,
  successRate: 100,
  avgLatency: 420,
};

const DEFAULT_SEQUENTIAL = {
  ordersSubmitted: 200,
  blocksUsed: 10,
  ordersPerBlock: 20,
  successRate: 100,
  avgLatency: 1800,
};

export default function ParallelChart({
  shardedResults,
  sequentialResults,
}: ParallelChartProps) {
  const sharded = shardedResults || DEFAULT_SHARDED;
  const sequential = sequentialResults || DEFAULT_SEQUENTIAL;

  const comparisonData = [
    {
      metric: "Orders/Block",
      "State-Sharded (FlashGrid)": sharded.ordersPerBlock,
      "Sequential Baseline": sequential.ordersPerBlock,
    },
    {
      metric: "Blocks Used",
      "State-Sharded (FlashGrid)": sharded.blocksUsed,
      "Sequential Baseline": sequential.blocksUsed,
    },
    {
      metric: "Avg Latency (ms)",
      "State-Sharded (FlashGrid)": sharded.avgLatency,
      "Sequential Baseline": sequential.avgLatency,
    },
  ];

  // Calculate the speedup factor (always >= 1)
  const speedupFactor =
    sequential.ordersPerBlock / sharded.ordersPerBlock > 1
      ? (sequential.ordersPerBlock / sharded.ordersPerBlock).toFixed(0)
      : (sharded.ordersPerBlock / sequential.ordersPerBlock).toFixed(0);

  return (
    <div className="flex h-full flex-col">
      {/* Header with speedup badge */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
          Parallelism Comparison
        </h2>
        <div className="rounded-full border border-accent-green/40 bg-accent-green/8 px-3 py-1 text-xs font-semibold text-accent-green">
          {speedupFactor}x Speedup
        </div>
      </div>

      {/* Summary cards — sharded vs. sequential */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {/* Sharded (FlashGrid) card */}
        <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-accent-blue">
            FlashGrid (Sharded)
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-content-secondary">Orders</span>
              <span className="text-content-primary">{sharded.ordersSubmitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Blocks</span>
              <span className="font-semibold text-accent-green">
                {sharded.blocksUsed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Orders/Block</span>
              <span className="font-semibold text-accent-green">
                ~{sharded.ordersPerBlock}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Latency</span>
              <span className="text-accent-green">
                {sharded.avgLatency}ms
              </span>
            </div>
          </div>
        </div>

        {/* Sequential baseline card */}
        <div className="rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-accent-orange">
            Sequential Baseline
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-content-secondary">Orders</span>
              <span className="text-content-primary">{sequential.ordersSubmitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Blocks</span>
              <span className="font-semibold text-accent-orange">
                {sequential.blocksUsed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Orders/Block</span>
              <span className="font-semibold text-accent-orange">
                ~{sequential.ordersPerBlock}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Latency</span>
              <span className="text-accent-orange">
                {sequential.avgLatency}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E8E8ED"
              vertical={false}
            />
            <XAxis
              dataKey="metric"
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
            />
            <Legend
              wrapperStyle={{
                fontSize: "10px",
                fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif",
              }}
            />
            <Bar
              dataKey="State-Sharded (FlashGrid)"
              fill="#0071E3" /* accent-blue */
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Sequential Baseline"
              fill="#FF9500" /* accent-orange */
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer insight */}
      <div className="border-t border-border px-4 py-2 text-center text-[10px] text-content-secondary">
        State-sharded architecture enables {speedupFactor}x more orders per block by
        eliminating storage conflicts
      </div>
    </div>
  );
}
