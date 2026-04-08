// @flashgrid/sdk — TypeScript SDK for FlashGrid parallel batch auction protocol

export { FlashGridClient, type FlashGridClientConfig } from "./client";
export { FLASHGRID_ABI, FACTORY_ABI, BENCHMARK_ABI } from "./abis";
export { CHAINS, getChain, getExplorerTxUrl, getExplorerAddressUrl } from "./chains";
export type {
  TickState,
  Order,
  OrderPlacedEvent,
  OrderCancelledEvent,
  TickSettledEvent,
  EpochCompletedEvent,
  MarketResolvedEvent,
  PayoutClaimedEvent,
  LiveOrder,
  ExecutionMetrics,
  ChainConfig,
} from "./types";
export { NUM_TICKS, TICK_PRICES, TICK_LABELS } from "./types";
