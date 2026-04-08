import type { ChainConfig } from "./types";
export declare const CHAINS: Record<number, ChainConfig>;
export declare function getChain(chainId: number): ChainConfig;
export declare function getExplorerTxUrl(chainId: number, hash: string): string;
export declare function getExplorerAddressUrl(chainId: number, address: string): string;
//# sourceMappingURL=chains.d.ts.map