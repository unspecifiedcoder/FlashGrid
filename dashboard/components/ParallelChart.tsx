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
  Cell,
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

// Default benchmark data (pre-loaded from expected test results)
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

  const speedup = (sequential.ordersPerBlock / sharded.ordersPerBlock) > 1
    ? (sequential.ordersPerBlock / sharded.ordersPerBlock).toFixed(0)
    : (sharded.ordersPerBlock / sequential.ordersPerBlock).toFixed(0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-monad-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Parallelism Comparison
        </h2>
        <div className="glow-green rounded-full border border-monad-accent/30 bg-monad-accent/10 px-3 py-1 text-xs font-bold text-monad-accent">
          {speedup}x Speedup
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="rounded-lg border border-monad-purple/30 bg-monad-purple/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-monad-purple">
            FlashGrid (Sharded)
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-monad-text">Orders</span>
              <span className="text-white">{sharded.ordersSubmitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-monad-text">Blocks</span>
              <span className="font-bold text-monad-accent">
                {sharded.blocksUsed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-monad-text">Orders/Block</span>
              <span className="font-bold text-monad-accent">
                ~{sharded.ordersPerBlock}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-monad-text">Latency</span>
              <span className="text-monad-accent">
                {sharded.avgLatency}ms
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-red-400">
            Sequential Baseline
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-monad-text">Orders</span>
              <span className="text-white">{sequential.ordersSubmitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-monad-text">Blocks</span>
              <span className="font-bold text-red-400">
                {sequential.blocksUsed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-monad-text">Orders/Block</span>
              <span className="font-bold text-red-400">
                ~{sequential.ordersPerBlock}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-monad-text">Latency</span>
              <span className="text-red-400">
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
              stroke="#2A2440"
              vertical={false}
            />
            <XAxis
              dataKey="metric"
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
            />
            <Legend
              wrapperStyle={{ fontSize: "10px", fontFamily: "JetBrains Mono" }}
            />
            <Bar
              dataKey="State-Sharded (FlashGrid)"
              fill="#836EF9"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Sequential Baseline"
              fill="#FF6B6B"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer insight */}
      <div className="border-t border-monad-border px-4 py-2 text-center text-[10px] text-monad-text">
        State-sharded architecture enables {speedup}x more orders per block by
        eliminating storage conflicts
      </div>
    </div>
  );
}
