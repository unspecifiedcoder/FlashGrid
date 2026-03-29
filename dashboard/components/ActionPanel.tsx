// ActionPanel.tsx
// Left-column settlement panel. Lists all ticks that currently have orders
// and lets the user settle them individually or all at once. Displays the
// current epoch number and a short explanation of how parallel settlement
// works on Monad.

"use client";

import { useState } from "react";
import { NUM_TICKS, TICK_LABELS } from "@/lib/types";

interface ActionPanelProps {
  connected: boolean;
  currentEpoch: number;
  onSettleTick: (tick: number) => Promise<void>;
  onSettleAll: () => Promise<void>;
  tickData: Array<{
    index: number;
    yesLiquidity: string;
    noLiquidity: string;
    orderCount: number;
  }>;
}

export default function ActionPanel({
  connected,
  currentEpoch,
  onSettleTick,
  onSettleAll,
  tickData,
}: ActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /** Only ticks that have at least one order are shown as settleable. */
  const activeTicks = tickData.filter((t) => t.orderCount > 0);

  const handleSettleAll = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await onSettleAll();
      setStatus({ type: "success", message: `Epoch ${currentEpoch} settled. New epoch started.` });
    } catch (err: any) {
      setStatus({ type: "error", message: err.shortMessage || err.message });
    }
    setLoading(false);
  };

  const handleSettleTick = async (tick: number) => {
    setLoading(true);
    setStatus(null);
    try {
      await onSettleTick(tick);
      setStatus({ type: "success", message: `Tick ${TICK_LABELS[tick]} settled` });
    } catch (err: any) {
      setStatus({ type: "error", message: err.shortMessage || err.message });
    }
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
          Settlement
        </h2>
        <div className="rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-[10px] text-content-secondary">
          Epoch {currentEpoch}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!connected ? (
          <p className="text-center text-sm text-content-secondary">
            Connect wallet to settle
          </p>
        ) : (
          <div className="space-y-4">
            {/* Settle All button */}
            <button
              onClick={handleSettleAll}
              disabled={loading || activeTicks.length === 0}
              className="w-full rounded-lg bg-accent-blue py-3 text-sm font-semibold text-content-inverse transition-interactive hover:bg-accent-blue/85 disabled:opacity-40"
            >
              {loading ? "Settling..." : `Settle All (${activeTicks.length} active ticks)`}
            </button>

            {/* Active ticks list */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-content-tertiary">
                Active Ticks ({activeTicks.length}/{NUM_TICKS})
              </div>

              {activeTicks.length === 0 ? (
                <div className="rounded-lg border border-border-light bg-surface-secondary p-4 text-center text-xs text-content-secondary">
                  No active ticks. Place some orders first.
                </div>
              ) : (
                <div className="space-y-1">
                  {activeTicks.map((tick) => (
                    <div
                      key={tick.index}
                      className="flex items-center justify-between rounded-lg border border-border-light bg-surface-secondary px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-content-primary">
                          {TICK_LABELS[tick.index]}
                        </span>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-accent-green">
                            Y:{parseFloat(tick.yesLiquidity).toFixed(3)}
                          </span>
                          <span className="text-accent-red">
                            N:{parseFloat(tick.noLiquidity).toFixed(3)}
                          </span>
                        </div>
                        <span className="text-[10px] text-content-tertiary">
                          {tick.orderCount} orders
                        </span>
                      </div>
                      <button
                        onClick={() => handleSettleTick(tick.index)}
                        disabled={loading}
                        className="rounded border border-accent-blue/50 px-2 py-1 text-[10px] text-accent-blue transition-interactive hover:bg-accent-blue/8 disabled:opacity-40"
                      >
                        Settle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explanation box */}
            <div className="rounded-lg border border-border-light bg-surface-secondary p-3 text-[10px] leading-relaxed text-content-secondary">
              <strong className="text-content-primary">How settlement works:</strong>
              <br />
              Each tick settles independently - matching YES and NO liquidity.
              On Monad, separate ticks settle in parallel with zero storage conflicts.
              After settling, the epoch advances.
            </div>
          </div>
        )}
      </div>

      {/* Status toast */}
      {status && (
        <div
          className={`border-t px-4 py-2 text-xs ${
            status.type === "success"
              ? "border-accent-green/30 bg-accent-green/8 text-accent-green"
              : "border-accent-red/30 bg-accent-red/8 text-accent-red"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
