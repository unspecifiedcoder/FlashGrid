"use client";

import { useState, useEffect, useCallback } from "react";
import Heatmap from "@/components/Heatmap";
import OrderFeed from "@/components/OrderFeed";
import MetricsPanel from "@/components/MetricsPanel";
import ParallelChart from "@/components/ParallelChart";
import WalletButton from "@/components/WalletButton";
import TradingPanel from "@/components/TradingPanel";
import ActionPanel from "@/components/ActionPanel";
import DemoPanel from "@/components/DemoPanel";
import type {
  LiveOrder,
  MetricsResponse,
  TicksResponse,
} from "@/lib/types";
import {
  connectWallet,
  getBalances,
  deposit,
  withdraw,
  placeOrder,
  settleTick as settleTickFn,
  settleAll as settleAllFn,
  getExplorerTxUrl,
} from "@/lib/wallet";
import type { WalletClient, PublicClient } from "viem";

const POLL_INTERVAL = 2000;

export default function Dashboard() {
  // ─── Wallet State ──────────────────────────────────────────
  const [address, setAddress] = useState<string | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [monBalance, setMonBalance] = useState("0");
  const [gridBalance, setGridBalance] = useState("0");

  // ─── Data State ────────────────────────────────────────────
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse>({
    ordersPerBlock: [],
    totalOrders: 0,
    totalVolume: "0",
    avgLatency: 0,
    successRate: 0,
    activeEpoch: 1,
    activeTicks: 0,
    blocksProcessed: 0,
  });
  const [ticks, setTicks] = useState<TicksResponse>({
    ticks: Array.from({ length: 20 }, (_, i) => ({
      index: i,
      price: ((i + 1) * 5) / 100,
      yesLiquidity: "0",
      noLiquidity: "0",
      orderCount: 0,
      lastMatchedEpoch: 0,
    })),
    currentEpoch: 1,
  });
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"trade" | "settle" | "demo" | "compare">(
    "trade"
  );
  const [recentTxs, setRecentTxs] = useState<
    Array<{ hash: string; label: string; time: number }>
  >([]);

  // ─── Hydration-safe mount flag ─────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Wallet Connection ─────────────────────────────────────
  const handleConnect = useCallback(async () => {
    try {
      const { address: addr, walletClient: wc, publicClient: pc } = await connectWallet();
      setAddress(addr);
      setWalletClient(wc);
      setPublicClient(pc);
    } catch (err: any) {
      alert(err.message);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    setPublicClient(null);
    setMonBalance("0");
    setGridBalance("0");
  }, []);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!address || !publicClient) return;
    try {
      const { monBalance: mon, gridBalance: grid } = await getBalances(
        publicClient,
        address
      );
      setMonBalance(mon);
      setGridBalance(grid);
    } catch {
      // Ignore balance fetch errors
    }
  }, [address, publicClient]);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 5000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        setAddress(accounts[0]);
      }
    };
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [handleDisconnect]);

  // ─── Contract Interactions ─────────────────────────────────
  const addTx = (hash: string, label: string) => {
    setRecentTxs((prev) => [{ hash, label, time: Date.now() }, ...prev].slice(0, 10));
  };

  const handleDeposit = async (amount: string) => {
    if (!walletClient || !publicClient) throw new Error("Wallet not connected");
    const hash = await deposit(walletClient, publicClient, amount);
    addTx(hash, `Deposit ${amount} MON`);
    await refreshBalances();
    fetchData();
  };

  const handleWithdraw = async (amount: string) => {
    if (!walletClient || !publicClient) throw new Error("Wallet not connected");
    const hash = await withdraw(walletClient, publicClient, amount);
    addTx(hash, `Withdraw ${amount} MON`);
    await refreshBalances();
    fetchData();
  };

  const handlePlaceOrder = async (
    tick: number,
    amount: string,
    isYes: boolean
  ) => {
    if (!walletClient || !publicClient) throw new Error("Wallet not connected");
    const hash = await placeOrder(walletClient, publicClient, tick, amount, isYes);
    addTx(hash, `${isYes ? "YES" : "NO"} @ tick ${tick}`);
    await refreshBalances();
    fetchData();
  };

  const handleSettleTick = async (tick: number) => {
    if (!walletClient || !publicClient) throw new Error("Wallet not connected");
    const hash = await settleTickFn(walletClient, publicClient, tick);
    addTx(hash, `Settle tick ${tick}`);
    fetchData();
  };

  const handleSettleAll = async () => {
    if (!walletClient || !publicClient) throw new Error("Wallet not connected");
    const hash = await settleAllFn(walletClient, publicClient);
    addTx(hash, "Settle all ticks");
    fetchData();
  };

  // ─── Data Polling ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, metricsRes, ticksRes] = await Promise.all([
        fetch("/api/events?limit=100"),
        fetch("/api/metrics"),
        fetch("/api/ticks"),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setOrders(data.orders || []);
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
      if (ticksRes.ok) {
        const data = await ticksRes.json();
        setTicks(data);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (isLive) {
      const interval = setInterval(fetchData, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [isLive, fetchData]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ═══ TOP BAR ═══ */}
      <header className="flex items-center justify-between border-b border-monad-border bg-monad-dark px-4 py-2.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="glow-purple flex h-8 w-8 items-center justify-center rounded-lg bg-monad-purple text-sm font-bold text-white">
              FG
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-white">
                FlashGrid
              </h1>
              <p className="text-[10px] text-monad-text">
                Parallel Batch Auction Engine
              </p>
            </div>
          </div>

          <div className="rounded-full border border-monad-purple/30 bg-monad-purple/10 px-3 py-1 text-[10px] font-medium text-monad-purple">
            Monad Testnet
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all ${
              isLive
                ? "border-monad-accent/30 bg-monad-accent/10 text-monad-accent"
                : "border-monad-border bg-monad-card text-monad-text"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isLive ? "live-indicator bg-monad-accent" : "bg-monad-text"
              }`}
            />
            {isLive ? "LIVE" : "PAUSED"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-monad-text">
            {mounted && lastUpdate ? lastUpdate.toLocaleTimeString() : "--:--:--"}
          </span>
          <WalletButton
            address={address}
            monBalance={monBalance}
            gridBalance={gridBalance}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      {/* ═══ MAIN LAYOUT: 3 columns ═══ */}
      <main className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Interactive panels */}
        <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-monad-border bg-monad-dark">
          {/* Tab selector */}
          <div className="flex border-b border-monad-border">
            {(
              [
                { key: "trade", label: "Trade" },
                { key: "settle", label: "Settle" },
                { key: "demo", label: "Demo" },
                { key: "compare", label: "Compare" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-all ${
                  activeTab === key
                    ? "border-b-2 border-monad-purple bg-monad-card/30 text-monad-purple"
                    : "text-monad-text hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "trade" && (
              <TradingPanel
                connected={!!address}
                gridBalance={gridBalance}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
                onPlaceOrder={handlePlaceOrder}
              />
            )}
            {activeTab === "settle" && (
              <ActionPanel
                connected={!!address}
                currentEpoch={ticks.currentEpoch}
                onSettleTick={handleSettleTick}
                onSettleAll={handleSettleAll}
                tickData={ticks.ticks}
              />
            )}
            {activeTab === "demo" && (
              <DemoPanel onComplete={fetchData} />
            )}
            {activeTab === "compare" && (
              <div className="h-full overflow-y-auto">
                <ParallelChart />
              </div>
            )}
          </div>

          {/* Recent transactions */}
          {recentTxs.length > 0 && (
            <div className="border-t border-monad-border">
              <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-monad-text">
                Recent Transactions
              </div>
              <div className="max-h-[120px] overflow-y-auto">
                {recentTxs.map((tx) => (
                  <a
                    key={tx.hash}
                    href={getExplorerTxUrl(tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border-t border-monad-border/30 px-3 py-1.5 text-[10px] hover:bg-monad-card/30"
                  >
                    <span className="text-monad-text">{tx.label}</span>
                    <span className="font-mono text-monad-purple">
                      {tx.hash.slice(0, 8)}...
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER + RIGHT: Monitoring panels */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top row: Heatmap + Metrics */}
          <div className="flex flex-1 overflow-hidden">
            {/* Heatmap */}
            <div className="flex-1 border-b border-r border-monad-border bg-monad-dark">
              <Heatmap tickData={ticks.ticks} settlements={[]} />
            </div>

            {/* Metrics */}
            <div className="w-[320px] flex-shrink-0 border-b border-monad-border bg-monad-dark">
              <MetricsPanel
                ordersPerBlock={metrics.ordersPerBlock}
                totalOrders={metrics.totalOrders}
                totalVolume={metrics.totalVolume}
                avgLatency={metrics.avgLatency}
                successRate={metrics.successRate}
                activeEpoch={metrics.activeEpoch}
                activeTicks={metrics.activeTicks}
              />
            </div>
          </div>

          {/* Bottom row: Order Feed (full width) */}
          <div className="h-[280px] flex-shrink-0 bg-monad-dark">
            <OrderFeed orders={orders} />
          </div>
        </div>
      </main>

      {/* ═══ BOTTOM STATUS BAR ═══ */}
      <footer className="flex items-center justify-between border-t border-monad-border bg-monad-dark px-4 py-1 text-[10px] text-monad-text">
        <div className="flex items-center gap-3">
          <span>Chain: 10143</span>
          <span className="text-monad-border">|</span>
          <span>Epoch: {ticks.currentEpoch}</span>
          <span className="text-monad-border">|</span>
          <span>Blocks: {metrics.blocksProcessed}</span>
          <span className="text-monad-border">|</span>
          <span>Orders: {metrics.totalOrders}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono">testnet-rpc.monad.xyz</span>
          <span className="text-monad-border">|</span>
          <a
            href="https://testnet.monadvision.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-monad-purple hover:underline"
          >
            Explorer
          </a>
          {address && (
            <>
              <span className="text-monad-border">|</span>
              <a
                href={`https://testnet.monadvision.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-monad-purple hover:underline"
              >
                My Account
              </a>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
