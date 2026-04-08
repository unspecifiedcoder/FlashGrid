export interface TickState {
    totalYesLiquidity: bigint;
    totalNoLiquidity: bigint;
    orderCount: number;
    lastSettledEpoch: number;
}
export interface Order {
    maker: string;
    amount: bigint;
    isYes: boolean;
    epoch: number;
    cancelled: boolean;
    claimed: boolean;
}
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
export interface OrderCancelledEvent {
    tick: number;
    maker: string;
    orderIndex: bigint;
    amount: bigint;
    blockNumber: bigint;
    transactionHash: string;
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
export interface MarketResolvedEvent {
    outcomeYes: boolean;
    resolvedBy: string;
    blockNumber: bigint;
    transactionHash: string;
}
export interface PayoutClaimedEvent {
    tick: number;
    maker: string;
    amount: bigint;
    blockNumber: bigint;
    transactionHash: string;
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
export interface ExecutionMetrics {
    ordersPerBlock: number[];
    avgLatency: number;
    successRate: number;
    totalOrders: number;
    activeEpoch: number;
    activeTicks: number;
}
export interface ChainConfig {
    id: number;
    name: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: {
        default: {
            http: string[];
        };
    };
    blockExplorers: {
        default: {
            name: string;
            url: string;
        };
    };
}
export declare const NUM_TICKS = 20;
export declare const TICK_PRICES: number[];
export declare const TICK_LABELS: string[];
//# sourceMappingURL=types.d.ts.map