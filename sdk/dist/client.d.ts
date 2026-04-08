import { type PublicClient, type WalletClient, type Hash } from "viem";
import type { ChainConfig } from "./types";
export interface FlashGridClientConfig {
    chainId: number;
    marketAddress: `0x${string}`;
    factoryAddress?: `0x${string}`;
}
export declare class FlashGridClient {
    readonly chainId: number;
    readonly chain: ChainConfig;
    readonly marketAddress: `0x${string}`;
    readonly factoryAddress?: `0x${string}`;
    readonly publicClient: PublicClient;
    constructor(config: FlashGridClientConfig);
    getBalance(address: `0x${string}`): Promise<string>;
    getTickState(tick: number): Promise<readonly [bigint, bigint, number, number]>;
    getAllTickStates(): Promise<readonly [{
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }, {
        totalYesLiquidity: bigint;
        totalNoLiquidity: bigint;
        orderCount: number;
        lastSettledEpoch: number;
    }]>;
    isResolved(): Promise<boolean>;
    getOutcome(): Promise<boolean>;
    getCurrentEpoch(): Promise<number>;
    getMarketQuestion(): Promise<string>;
    deposit(walletClient: WalletClient, amount: string): Promise<Hash>;
    withdraw(walletClient: WalletClient, amount: string): Promise<Hash>;
    placeOrder(walletClient: WalletClient, tick: number, amount: string, isYes: boolean): Promise<Hash>;
    cancelOrder(walletClient: WalletClient, tick: number, orderIndex: bigint): Promise<Hash>;
    resolveMarket(walletClient: WalletClient, outcomeYes: boolean): Promise<Hash>;
    settleAll(walletClient: WalletClient): Promise<Hash>;
}
//# sourceMappingURL=client.d.ts.map