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
import { MONAD_TESTNET, ADDRESSES, FLASHGRID_ABI, BENCHMARK_ABI } from "./contract";

// ═══════════════════════════════════════════════════════════
//                  MONAD CHAIN DEFINITION
// ═══════════════════════════════════════════════════════════

export const monadChain = {
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  nativeCurrency: MONAD_TESTNET.nativeCurrency,
  rpcUrls: MONAD_TESTNET.rpcUrls,
} as const;

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

  // Request accounts
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found");
  }

  // Switch to Monad testnet
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${MONAD_TESTNET.id.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${MONAD_TESTNET.id.toString(16)}`,
            chainName: MONAD_TESTNET.name,
            nativeCurrency: MONAD_TESTNET.nativeCurrency,
            rpcUrls: MONAD_TESTNET.rpcUrls.default.http,
            blockExplorerUrls: [MONAD_TESTNET.blockExplorers.default.url],
          },
        ],
      });
    }
  }

  const walletClient = createWalletClient({
    chain: monadChain,
    transport: custom(window.ethereum),
    account: accounts[0] as `0x${string}`,
  });

  const publicClient = createPublicClient({
    chain: monadChain,
    transport: http(MONAD_TESTNET.rpcUrls.default.http[0]),
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
    chain: monadChain,
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
    chain: monadChain,
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
    chain: monadChain,
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
    chain: monadChain,
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
    chain: monadChain,
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
    chain: monadChain,
    account: walletClient.account!,
  });

  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export function getExplorerTxUrl(hash: string): string {
  return `${MONAD_TESTNET.blockExplorers.default.url}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${MONAD_TESTNET.blockExplorers.default.url}/address/${address}`;
}
