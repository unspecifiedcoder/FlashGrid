// types.ts
// Shared TypeScript type definitions and constants for the FlashGrid dashboard.
// Includes contract-level types, event types, API response shapes, and the
// canonical list of tick prices/labels/colors used across all visual components.

// ── Contract Types ──────────────────────────────────────────────

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

// ── Event Types ─────────────────────────────────────────────────

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

// ── Dashboard Types ─────────────────────────────────────────────

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

// ── API Response Types ──────────────────────────────────────────

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

// ── Constants ───────────────────────────────────────────────────

/** The number of discrete price ticks in each FlashGrid market. */
export const NUM_TICKS = 20;

/** Decimal prices for each tick: 0.05, 0.10, ..., 1.00 */
export const TICK_PRICES = Array.from({ length: NUM_TICKS }, (_, i) =>
  ((i + 1) * 5) / 100
);

/** Human-readable price labels like "$0.05", "$0.10", etc. */
export const TICK_LABELS = TICK_PRICES.map((p) => `$${p.toFixed(2)}`);

/**
 * A neutral color palette for the 20 ticks, progressing from cool steel-blue
 * tones at low ticks through teal and warm slate at high ticks.
 * No purple, no neon — just clean, distinguishable hues.
 */
export const TICK_COLORS = [
  "#3B82A0", "#3590A8", "#2F9EB0", "#29ACB8", "#23BAC0",
  "#1DC8C8", "#2BB8B0", "#39A898", "#479880", "#558868",
  "#5E8060", "#6B7858", "#787050", "#856848", "#926040",
  "#9F5838", "#A85240", "#B04C48", "#B84650", "#C04058",
];
