"use client";

import { useState } from "react";
import { TICK_LABELS, TICK_PRICES, NUM_TICKS } from "@/lib/types";

interface TradingPanelProps {
  connected: boolean;
  gridBalance: string;
  onDeposit: (amount: string) => Promise<void>;
  onWithdraw: (amount: string) => Promise<void>;
  onPlaceOrder: (tick: number, amount: string, isYes: boolean) => Promise<void>;
}

type Tab = "deposit" | "order";

export default function TradingPanel({
  connected,
  gridBalance,
  onDeposit,
  onWithdraw,
  onPlaceOrder,
}: TradingPanelProps) {
  const [tab, setTab] = useState<Tab>("deposit");
  const [depositAmount, setDepositAmount] = useState("0.1");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [orderTick, setOrderTick] = useState(9); // $0.50
  const [orderAmount, setOrderAmount] = useState("0.01");
  const [orderSide, setOrderSide] = useState<"YES" | "NO">("YES");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setLoading(true);
    setTxStatus(null);
    try {
      await onDeposit(depositAmount);
      setTxStatus({ type: "success", message: `Deposited ${depositAmount} MON` });
      setDepositAmount("0.1");
    } catch (err: any) {
      setTxStatus({ type: "error", message: err.shortMessage || err.message });
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setLoading(true);
    setTxStatus(null);
    try {
      await onWithdraw(withdrawAmount);
      setTxStatus({ type: "success", message: `Withdrew ${withdrawAmount} MON` });
      setWithdrawAmount("");
    } catch (err: any) {
      setTxStatus({ type: "error", message: err.shortMessage || err.message });
    }
    setLoading(false);
  };

  const handlePlaceOrder = async () => {
    if (!orderAmount || parseFloat(orderAmount) <= 0) return;
    setLoading(true);
    setTxStatus(null);
    try {
      await onPlaceOrder(orderTick, orderAmount, orderSide === "YES");
      setTxStatus({
        type: "success",
        message: `${orderSide} order at ${TICK_LABELS[orderTick]} for ${orderAmount} MON`,
      });
    } catch (err: any) {
      setTxStatus({ type: "error", message: err.shortMessage || err.message });
    }
    setLoading(false);
  };

  if (!connected) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-monad-border px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Trading
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-monad-border bg-monad-card">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="#836EF9" strokeWidth="1.5" />
                <path d="M11 8.5C11 9.05 10.55 9.5 10 9.5C9.45 9.5 9 9.05 9 8.5C9 7.95 9.45 7.5 10 7.5C10.55 7.5 11 7.95 11 8.5Z" fill="#836EF9" />
              </svg>
            </div>
            <p className="text-sm text-monad-text">
              Connect your wallet to start trading
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-monad-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Trading
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-monad-border">
        <button
          onClick={() => setTab("deposit")}
          className={`flex-1 py-2 text-xs font-medium uppercase transition-all ${
            tab === "deposit"
              ? "border-b-2 border-monad-purple text-monad-purple"
              : "text-monad-text hover:text-white"
          }`}
        >
          Deposit / Withdraw
        </button>
        <button
          onClick={() => setTab("order")}
          className={`flex-1 py-2 text-xs font-medium uppercase transition-all ${
            tab === "order"
              ? "border-b-2 border-monad-purple text-monad-purple"
              : "text-monad-text hover:text-white"
          }`}
        >
          Place Order
        </button>
      </div>

      {/* Grid balance */}
      <div className="border-b border-monad-border/50 bg-monad-card/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase text-monad-text">Grid Balance</span>
          <span className="text-sm font-bold text-monad-accent">
            {parseFloat(gridBalance).toFixed(4)} MON
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "deposit" ? (
          <div className="space-y-4">
            {/* Deposit */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-monad-text">
                Deposit MON
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="flex-1 rounded-lg border border-monad-border bg-monad-darker px-3 py-2 text-sm text-white outline-none focus:border-monad-purple"
                  placeholder="0.1"
                />
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className="rounded-lg bg-monad-purple px-4 py-2 text-xs font-bold text-white transition-all hover:bg-monad-purple/80 disabled:opacity-50"
                >
                  {loading ? "..." : "Deposit"}
                </button>
              </div>
              <div className="mt-1 flex gap-1">
                {["0.05", "0.1", "0.5", "1.0"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDepositAmount(v)}
                    className="rounded border border-monad-border px-2 py-0.5 text-[10px] text-monad-text hover:border-monad-purple hover:text-monad-purple"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-monad-border" />
              <span className="text-[10px] text-monad-text">OR</span>
              <div className="h-px flex-1 bg-monad-border" />
            </div>

            {/* Withdraw */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-monad-text">
                Withdraw MON
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="flex-1 rounded-lg border border-monad-border bg-monad-darker px-3 py-2 text-sm text-white outline-none focus:border-monad-purple"
                  placeholder={gridBalance}
                />
                <button
                  onClick={handleWithdraw}
                  disabled={loading}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                >
                  {loading ? "..." : "Withdraw"}
                </button>
              </div>
              <button
                onClick={() => setWithdrawAmount(gridBalance)}
                className="mt-1 rounded border border-monad-border px-2 py-0.5 text-[10px] text-monad-text hover:border-red-500 hover:text-red-400"
              >
                Max
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Side selection */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-monad-text">
                Side
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderSide("YES")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                    orderSide === "YES"
                      ? "bg-monad-accent text-monad-darker"
                      : "border border-monad-border text-monad-text hover:border-monad-accent hover:text-monad-accent"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setOrderSide("NO")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                    orderSide === "NO"
                      ? "bg-red-500 text-white"
                      : "border border-monad-border text-monad-text hover:border-red-500 hover:text-red-400"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Tick selection */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-monad-text">
                Price Tick: {TICK_LABELS[orderTick]}
              </label>
              <input
                type="range"
                min="0"
                max={NUM_TICKS - 1}
                value={orderTick}
                onChange={(e) => setOrderTick(parseInt(e.target.value))}
                className="w-full accent-monad-purple"
              />
              <div className="mt-1 flex justify-between text-[9px] text-monad-text">
                <span>$0.05</span>
                <span>$0.50</span>
                <span>$1.00</span>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-monad-text">
                Amount (MON)
              </label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                step="0.001"
                min="0"
                className="w-full rounded-lg border border-monad-border bg-monad-darker px-3 py-2 text-sm text-white outline-none focus:border-monad-purple"
                placeholder="0.01"
              />
              <div className="mt-1 flex gap-1">
                {["0.005", "0.01", "0.05", "0.1"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setOrderAmount(v)}
                    className="rounded border border-monad-border px-2 py-0.5 text-[10px] text-monad-text hover:border-monad-purple hover:text-monad-purple"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className={`w-full rounded-lg py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                orderSide === "YES"
                  ? "bg-monad-accent text-monad-darker hover:bg-monad-accent/80"
                  : "bg-red-500 text-white hover:bg-red-500/80"
              }`}
            >
              {loading
                ? "Submitting..."
                : `Place ${orderSide} Order at ${TICK_LABELS[orderTick]}`}
            </button>

            {/* Order summary */}
            <div className="rounded-lg border border-monad-border/50 bg-monad-card/30 p-3 text-xs">
              <div className="flex justify-between text-monad-text">
                <span>Side</span>
                <span className={orderSide === "YES" ? "text-monad-accent" : "text-red-400"}>
                  {orderSide}
                </span>
              </div>
              <div className="flex justify-between text-monad-text">
                <span>Tick Price</span>
                <span className="text-white">{TICK_LABELS[orderTick]}</span>
              </div>
              <div className="flex justify-between text-monad-text">
                <span>Amount</span>
                <span className="text-white">{orderAmount} MON</span>
              </div>
              <div className="flex justify-between text-monad-text">
                <span>Potential Payout</span>
                <span className="font-bold text-monad-accent">
                  {(parseFloat(orderAmount || "0") * 2).toFixed(4)} MON
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status message */}
      {txStatus && (
        <div
          className={`border-t px-4 py-2 text-xs ${
            txStatus.type === "success"
              ? "border-monad-accent/30 bg-monad-accent/10 text-monad-accent"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {txStatus.type === "success" ? "OK" : "ERR"}: {txStatus.message}
        </div>
      )}
    </div>
  );
}
