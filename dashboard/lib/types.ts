// ═══════════════════════════════════════════════════════════
//                    CONTRACT TYPES
// ═══════════════════════════════════════════════════════════

export interface TickState {
  totalYesLiquidity: bigint;
  totalNoLiquidity: bigint;
  orderCount: number;
  lastMatchedEpoch: number;
}

export interface Order {
  maker: string;
  amount: bigint;
  isYes: boolean;
  epoch: number;
}

// ═══════════════════════════════════════════════════════════
//                     EVENT TYPES
// ═══════════════════════════════════════════════════════════

export interface OrderPlacedEvent {
  tick: number;
  maker: string;
  amount: bigint;
  isYes: boolean;
  epoch: number;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

export interface TickSettledEvent {
  tick: number;
  epoch: number;
  yesMatched: bigint;
  noMatched: bigint;
  clearingPrice: bigint;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

export interface EpochCompletedEvent {
  epoch: number;
  totalVolume: bigint;
  ticksActive: number;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
//                   DASHBOARD TYPES
// ═══════════════════════════════════════════════════════════

export interface HeatmapCell {
  tick: number;
  time: number;
  yesLiquidity: number;
  noLiquidity: number;
  totalLiquidity: number;
  isSettled: boolean;
}

export interface ExecutionMetrics {
  ordersPerBlock: number[];
  avgLatency: number;
  successRate: number;
  totalOrders: number;
  activeEpoch: number;
  activeTicks: number;
}

export interface ParallelComparison {
  label: string;
  sharded: number;
  sequential: number;
}

export interface LiveOrder {
  id: string;
  tick: number;
  side: "YES" | "NO";
  amount: string;
  maker: string;
  blockNumber: number;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
//                     API TYPES
// ═══════════════════════════════════════════════════════════

export interface EventsResponse {
  orders: LiveOrder[];
  settlements: TickSettledEvent[];
  total: number;
}

export interface MetricsResponse {
  ordersPerBlock: number[];
  totalOrders: number;
  totalVolume: string;
  avgLatency: number;
  successRate: number;
  activeEpoch: number;
  activeTicks: number;
  blocksProcessed: number;
}

export interface TicksResponse {
  ticks: Array<{
    index: number;
    price: number;
    yesLiquidity: string;
    noLiquidity: string;
    orderCount: number;
    lastMatchedEpoch: number;
  }>;
  currentEpoch: number;
}

// ═══════════════════════════════════════════════════════════
//                     CONSTANTS
// ═══════════════════════════════════════════════════════════

export const NUM_TICKS = 20;

export const TICK_PRICES = Array.from({ length: NUM_TICKS }, (_, i) =>
  ((i + 1) * 5) / 100
);

export const TICK_LABELS = TICK_PRICES.map((p) => `$${p.toFixed(2)}`);

export const TICK_COLORS = [
  "#1e3a5f", "#1e4d6f", "#1e607f", "#1e738f", "#1e869f",
  "#1e99af", "#1eacbf", "#1ebfcf", "#1ed2df", "#1ee5ef",
  "#ef1ee5", "#df1ed2", "#cf1ebf", "#bf1eac", "#af1e99",
  "#9f1e86", "#8f1e73", "#7f1e60", "#6f1e4d", "#5f1e3a",
];
