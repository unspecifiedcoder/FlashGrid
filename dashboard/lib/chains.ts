// chains.ts
// Multi-chain configuration for FlashGrid. Supports Monad Testnet, Sepolia, and Base Sepolia.
// Chain selection is driven by NEXT_PUBLIC_CHAIN_ID environment variable.

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  blockExplorers: { default: { name: string; url: string } };
}

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

const DEFAULT_CHAIN_ID = 10143;

export function getChainId(): number {
  const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (envChainId) {
    const parsed = parseInt(envChainId, 10);
    if (CHAINS[parsed]) return parsed;
  }
  return DEFAULT_CHAIN_ID;
}

export function getChain(): ChainConfig {
  return CHAINS[getChainId()];
}

export function getExplorerTxUrl(hash: string): string {
  return `${getChain().blockExplorers.default.url}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${getChain().blockExplorers.default.url}/address/${address}`;
}
