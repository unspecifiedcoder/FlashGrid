// Multi-chain configuration for FlashGrid.

import type { ChainConfig } from "./types";

export const CHAINS: Record<number, ChainConfig> = {
  10143: {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
    blockExplorers: { default: { name: "MonadVision", url: "https://testnet.monadvision.com" } },
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.sepolia.org"] } },
    blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
    blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
  },
};

export function getChain(chainId: number): ChainConfig {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);
  return chain;
}

export function getExplorerTxUrl(chainId: number, hash: string): string {
  return `${getChain(chainId).blockExplorers.default.url}/tx/${hash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  return `${getChain(chainId).blockExplorers.default.url}/address/${address}`;
}
