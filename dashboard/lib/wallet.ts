// wallet.ts
// Client-side wallet interaction helpers for the FlashGrid dashboard.
// Uses multi-chain config from chains.ts for chain-agnostic operation.

"use client";

import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  formatEther,
  parseEther,
  type WalletClient,
  type PublicClient,
  type Hash,
} from "viem";
import { getChain, ADDRESSES, FLASHGRID_ABI, BENCHMARK_ABI } from "./contract";

// ═══════════════════════════════════════════════════════════
//                 WALLET CONNECTION
// ═══════════════════════════════════════════════════════════

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet(): Promise<{
  address: string;
  walletClient: WalletClient;
  publicClient: PublicClient;
}> {
  if (!window.ethereum) {
    throw new Error("No wallet found. Install MetaMask.");
  }

  const chain = getChain();

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found");
  }

  // Switch to configured chain
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chain.id.toString(16)}` }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chain.id.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
            blockExplorerUrls: [chain.blockExplorers.default.url],
          },
        ],
      });
    }
  }

  const viemChain = {
    id: chain.id,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls,
  } as const;

  const walletClient = createWalletClient({
    chain: viemChain,
    transport: custom(window.ethereum),
    account: accounts[0] as `0x${string}`,
  });

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(chain.rpcUrls.default.http[0]),
  });

  return {
    address: accounts[0],
    walletClient,
    publicClient,
  };
}

// ═══════════════════════════════════════════════════════════
//                CONTRACT INTERACTIONS
// ═══════════════════════════════════════════════════════════

const flashGridAddress = ADDRESSES.flashGrid as `0x${string}`;
const benchmarkAddress = ADDRESSES.benchmark as `0x${string}`;

function getViemChain() {
  const chain = getChain();
  return {
    id: chain.id,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls,
  } as const;
}

export async function getBalances(
  publicClient: PublicClient,
  address: string
): Promise<{ monBalance: string; gridBalance: string }> {
  const [monBal, gridBal] = await Promise.all([
    publicClient.getBalance({ address: address as `0x${string}` }),
    publicClient.readContract({
      address: flashGridAddress,
      abi: FLASHGRID_ABI,
      functionName: "balances",
      args: [address as `0x${string}`],
    }),
  ]);

  return {
    monBalance: formatEther(monBal),
    gridBalance: formatEther(gridBal as bigint),
  };
}

export async function deposit(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: string
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "deposit",
    value: parseEther(amount),
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function withdraw(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: string
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "withdraw",
    args: [parseEther(amount)],
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function placeOrder(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tick: number,
  amount: string,
  isYes: boolean
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "placeOrder",
    args: [tick, parseEther(amount), isYes],
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function cancelOrder(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tick: number,
  orderIndex: bigint
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "cancelOrder",
    args: [tick, orderIndex],
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function resolveMarket(
  walletClient: WalletClient,
  publicClient: PublicClient,
  outcomeYes: boolean
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "resolveMarket",
    args: [outcomeYes],
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function settleTick(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tick: number
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "settleTick",
    args: [tick],
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function settleAll(
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: flashGridAddress,
    abi: FLASHGRID_ABI,
    functionName: "settleAll",
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export async function placeBenchmarkOrder(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: string
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: benchmarkAddress,
    abi: BENCHMARK_ABI,
    functionName: "placeOrder",
    args: [parseEther(amount)],
    chain: getViemChain(),
    account: walletClient.account!,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export { getExplorerTxUrl, getExplorerAddressUrl } from "./chains";
