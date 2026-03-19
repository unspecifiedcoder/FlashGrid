// TradingPanel.tsx
// Left-column panel for deposit/withdraw and order placement.
// Contains two sub-tabs: "Deposit / Withdraw" and "Place Order".
// All interactive elements use the light Apple-inspired palette with
// accent-blue for primary actions and accent-green/accent-red for
// YES/NO sides. The wallet icon uses lucide-react.

"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { TICK_LABELS, TICK_PRICES, NUM_TICKS } from "@/lib/types";

interface TradingPanelProps {
  connected: boolean;
  gridBalance: string;
  onDeposit: (amount: string) => Promise<void>;
  onWithdraw: (amount: string) => Promise<void>;
  onPlaceOrder: (tick: number, amount: string, isYes: boolean) => Promise<void>;
}

type Tab = "deposit" | "order";

function formatMonAmount(amount: string, digits = 4): string {
  return parseFloat(amount || "0").toFixed(digits);
}

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

  const availableGridBalance = parseFloat(gridBalance || "0");
  const parsedOrderAmount = parseFloat(orderAmount || "0");
  const orderExceedsBalance = parsedOrderAmount > availableGridBalance;

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
    if (!orderAmount || parseFloat(orderAmount) <= 0 || orderExceedsBalance) return;
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

  // ── Not connected placeholder ─────────────────────────────────
  if (!connected) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
            Trading
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-secondary">
              <Wallet size={20} className="text-accent-blue" />
            </div>
            <p className="text-sm text-content-secondary">
              Connect your wallet to start trading
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected — full panel ────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
          Trading
        </h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("deposit")}
          className={`flex-1 py-2 text-xs font-medium uppercase transition-interactive ${
            tab === "deposit"
              ? "border-b-2 border-accent-blue text-accent-blue"
              : "text-content-tertiary hover:text-content-primary"
          }`}
        >
          Deposit / Withdraw
        </button>
        <button
          onClick={() => setTab("order")}
          className={`flex-1 py-2 text-xs font-medium uppercase transition-interactive ${
            tab === "order"
              ? "border-b-2 border-accent-blue text-accent-blue"
              : "text-content-tertiary hover:text-content-primary"
          }`}
        >
          Place Order
        </button>
      </div>

      {/* Grid balance bar */}
      <div className="border-b border-border-light bg-surface-secondary px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase text-content-tertiary">Grid Balance</span>
          <span className="text-sm font-semibold text-accent-green">
            {formatMonAmount(gridBalance)} MON
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "deposit" ? (
          <div className="space-y-4">
            {/* Deposit section */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-content-tertiary">
                Deposit MON
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-content-primary outline-none transition-interactive focus:border-accent-blue"
                  placeholder="0.1"
                />
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className="rounded-lg bg-accent-blue px-4 py-2 text-xs font-semibold text-content-inverse transition-interactive hover:bg-accent-blue/85 disabled:opacity-50"
                >
                  {loading ? "..." : "Deposit"}
                </button>
              </div>
              <div className="mt-1 flex gap-1">
                {["0.05", "0.1", "0.5", "1.0"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDepositAmount(v)}
                    className="rounded border border-border px-2 py-0.5 text-[10px] text-content-tertiary transition-interactive hover:border-accent-blue hover:text-accent-blue"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-content-tertiary">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Withdraw section */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-content-tertiary">
                Withdraw MON
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-content-primary outline-none transition-interactive focus:border-accent-blue"
                  placeholder={gridBalance}
                />
                <button
                  onClick={handleWithdraw}
                  disabled={loading}
                  className="rounded-lg border border-accent-red/50 bg-accent-red/8 px-4 py-2 text-xs font-semibold text-accent-red transition-interactive hover:bg-accent-red/15 disabled:opacity-50"
                >
                  {loading ? "..." : "Withdraw"}
                </button>
              </div>
              <button
                onClick={() => setWithdrawAmount(gridBalance)}
                className="mt-1 rounded border border-border px-2 py-0.5 text-[10px] text-content-tertiary transition-interactive hover:border-accent-red hover:text-accent-red"
              >
                Max
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Side selection */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-content-tertiary">
                Side
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderSide("YES")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-interactive ${
                    orderSide === "YES"
                      ? "bg-accent-green text-content-inverse"
                      : "border border-border text-content-tertiary hover:border-accent-green hover:text-accent-green"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setOrderSide("NO")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-interactive ${
                    orderSide === "NO"
                      ? "bg-accent-red text-content-inverse"
                      : "border border-border text-content-tertiary hover:border-accent-red hover:text-accent-red"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Tick selection slider */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-content-tertiary">
                Price Tick: {TICK_LABELS[orderTick]}
              </label>
              <input
                type="range"
                min="0"
                max={NUM_TICKS - 1}
                value={orderTick}
                onChange={(e) => setOrderTick(parseInt(e.target.value))}
                className="w-full accent-accent-blue"
              />
              <div className="mt-1 flex justify-between text-[9px] text-content-tertiary">
                <span>$0.05</span>
                <span>$0.50</span>
                <span>$1.00</span>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-content-tertiary">
                Amount (MON)
              </label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                step="0.001"
                min="0"
                className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-content-primary outline-none transition-interactive focus:border-accent-blue"
                placeholder="0.01"
              />
              <div className="mt-1 flex gap-1">
                {["0.005", "0.01", "0.05", "0.1"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setOrderAmount(v)}
                    className="rounded border border-border px-2 py-0.5 text-[10px] text-content-tertiary transition-interactive hover:border-accent-blue hover:text-accent-blue"
                  >
                    {v}
                  </button>
                ))}
                <button
                  onClick={() => setOrderAmount(Math.min(availableGridBalance, 0.25).toFixed(3))}
                  className="rounded border border-border px-2 py-0.5 text-[10px] text-content-tertiary transition-interactive hover:border-accent-blue hover:text-accent-blue"
                >
                  Quick Fill
                </button>
              </div>
              {orderExceedsBalance && (
                <div className="mt-2 text-[10px] text-accent-red">
                  Order amount exceeds available grid balance.
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading || orderExceedsBalance}
              className={`w-full rounded-lg py-3 text-sm font-semibold transition-interactive disabled:opacity-50 ${
                orderSide === "YES"
                  ? "bg-accent-green text-content-inverse hover:bg-accent-green/85"
                  : "bg-accent-red text-content-inverse hover:bg-accent-red/85"
              }`}
            >
              {loading
                ? "Submitting..."
                : `Place ${orderSide} Order at ${TICK_LABELS[orderTick]}`}
            </button>

            {/* Order summary card */}
            <div className="rounded-lg border border-border-light bg-surface-secondary p-3 text-xs">
              <div className="flex justify-between text-content-secondary">
                <span>Side</span>
                <span className={orderSide === "YES" ? "text-accent-green" : "text-accent-red"}>
                  {orderSide}
                </span>
              </div>
              <div className="flex justify-between text-content-secondary">
                <span>Tick Price</span>
                <span className="text-content-primary">{TICK_LABELS[orderTick]}</span>
              </div>
              <div className="flex justify-between text-content-secondary">
                <span>Amount</span>
                <span className="text-content-primary">{formatMonAmount(orderAmount, 3)} MON</span>
              </div>
              <div className="flex justify-between text-content-secondary">
                <span>Potential Payout</span>
                <span className="font-semibold text-accent-green">
                  {(Math.max(parsedOrderAmount, 0) * 2).toFixed(4)} MON
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction status toast */}
      {txStatus && (
        <div
          className={`border-t px-4 py-2 text-xs ${
            txStatus.type === "success"
              ? "border-accent-green/30 bg-accent-green/8 text-accent-green"
              : "border-accent-red/30 bg-accent-red/8 text-accent-red"
          }`}
        >
          {txStatus.type === "success" ? "OK" : "ERR"}: {txStatus.message}
        </div>
      )}
    </div>
  );
}
