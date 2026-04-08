// High-level client for interacting with FlashGrid markets.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Account,
  type Chain,
} from "viem";
import { FLASHGRID_ABI, FACTORY_ABI } from "./abis";
import { getChain } from "./chains";
import type { ChainConfig } from "./types";

export interface FlashGridClientConfig {
  chainId: number;
  marketAddress: `0x${string}`;
  factoryAddress?: `0x${string}`;
}

export class FlashGridClient {
  public readonly chainId: number;
  public readonly chain: ChainConfig;
  public readonly marketAddress: `0x${string}`;
  public readonly factoryAddress?: `0x${string}`;
  public readonly publicClient: PublicClient;

  constructor(config: FlashGridClientConfig) {
    this.chainId = config.chainId;
    this.chain = getChain(config.chainId);
    this.marketAddress = config.marketAddress;
    this.factoryAddress = config.factoryAddress;

    this.publicClient = createPublicClient({
      chain: {
        id: this.chain.id,
        name: this.chain.name,
        nativeCurrency: this.chain.nativeCurrency,
        rpcUrls: this.chain.rpcUrls,
      } as Chain,
      transport: http(this.chain.rpcUrls.default.http[0]),
    });
  }

  // ── Read Methods ────────────────────────────────────────────

  async getBalance(address: `0x${string}`): Promise<string> {
    const bal = await this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "balances",
      args: [address],
    });
    return formatEther(bal as bigint);
  }

  async getTickState(tick: number) {
    return this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "getTickState",
      args: [tick],
    });
  }

  async getAllTickStates() {
    return this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "getAllTickStates",
    });
  }

  async isResolved(): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "resolved",
    }) as Promise<boolean>;
  }

  async getOutcome(): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "outcomeYes",
    }) as Promise<boolean>;
  }

  async getCurrentEpoch(): Promise<number> {
    return this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "currentEpoch",
    }) as Promise<number>;
  }

  async getMarketQuestion(): Promise<string> {
    return this.publicClient.readContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "marketQuestion",
    }) as Promise<string>;
  }

  // ── Write Methods ───────────────────────────────────────────

  async deposit(walletClient: WalletClient, amount: string): Promise<Hash> {
    const hash = await walletClient.writeContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "deposit",
      value: parseEther(amount),
      chain: this.publicClient.chain,
      account: walletClient.account as Account,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async withdraw(walletClient: WalletClient, amount: string): Promise<Hash> {
    const hash = await walletClient.writeContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "withdraw",
      args: [parseEther(amount)],
      chain: this.publicClient.chain,
      account: walletClient.account as Account,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async placeOrder(
    walletClient: WalletClient,
    tick: number,
    amount: string,
    isYes: boolean
  ): Promise<Hash> {
    const hash = await walletClient.writeContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "placeOrder",
      args: [tick, parseEther(amount), isYes],
      chain: this.publicClient.chain,
      account: walletClient.account as Account,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async cancelOrder(
    walletClient: WalletClient,
    tick: number,
    orderIndex: bigint
  ): Promise<Hash> {
    const hash = await walletClient.writeContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "cancelOrder",
      args: [tick, orderIndex],
      chain: this.publicClient.chain,
      account: walletClient.account as Account,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async resolveMarket(
    walletClient: WalletClient,
    outcomeYes: boolean
  ): Promise<Hash> {
    const hash = await walletClient.writeContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "resolveMarket",
      args: [outcomeYes],
      chain: this.publicClient.chain,
      account: walletClient.account as Account,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async settleAll(walletClient: WalletClient): Promise<Hash> {
    const hash = await walletClient.writeContract({
      address: this.marketAddress,
      abi: FLASHGRID_ABI,
      functionName: "settleAll",
      chain: this.publicClient.chain,
      account: walletClient.account as Account,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }
}
