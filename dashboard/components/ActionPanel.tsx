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
      <div className="flex items-center justify-between border-b border-monad-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Settlement
        </h2>
        <div className="rounded-full border border-monad-border bg-monad-card px-2 py-0.5 text-[10px] text-monad-text">
          Epoch {currentEpoch}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!connected ? (
          <p className="text-center text-sm text-monad-text">
            Connect wallet to settle
          </p>
        ) : (
          <div className="space-y-4">
            {/* Settle All button */}
            <button
              onClick={handleSettleAll}
              disabled={loading || activeTicks.length === 0}
              className="w-full rounded-lg bg-monad-purple py-3 text-sm font-bold text-white transition-all hover:bg-monad-purple/80 disabled:opacity-40"
            >
              {loading ? "Settling..." : `Settle All (${activeTicks.length} active ticks)`}
            </button>

            {/* Active ticks list */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-monad-text">
                Active Ticks ({activeTicks.length}/{NUM_TICKS})
              </div>

              {activeTicks.length === 0 ? (
                <div className="rounded-lg border border-monad-border/50 bg-monad-card/30 p-4 text-center text-xs text-monad-text">
                  No active ticks. Place some orders first.
                </div>
              ) : (
                <div className="space-y-1">
                  {activeTicks.map((tick) => (
                    <div
                      key={tick.index}
                      className="flex items-center justify-between rounded-lg border border-monad-border/30 bg-monad-card/20 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white">
                          {TICK_LABELS[tick.index]}
                        </span>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-monad-accent">
                            Y:{parseFloat(tick.yesLiquidity).toFixed(3)}
                          </span>
                          <span className="text-red-400">
                            N:{parseFloat(tick.noLiquidity).toFixed(3)}
                          </span>
                        </div>
                        <span className="text-[10px] text-monad-text">
                          {tick.orderCount} orders
                        </span>
                      </div>
                      <button
                        onClick={() => handleSettleTick(tick.index)}
                        disabled={loading}
                        className="rounded border border-monad-purple/50 px-2 py-1 text-[10px] text-monad-purple hover:bg-monad-purple/10 disabled:opacity-40"
                      >
                        Settle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-monad-border/30 bg-monad-card/20 p-3 text-[10px] leading-relaxed text-monad-text">
              <strong className="text-white">How settlement works:</strong>
              <br />
              Each tick settles independently - matching YES and NO liquidity.
              On Monad, separate ticks settle in parallel with zero storage conflicts.
              After settling, the epoch advances.
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {status && (
        <div
          className={`border-t px-4 py-2 text-xs ${
            status.type === "success"
              ? "border-monad-accent/30 bg-monad-accent/10 text-monad-accent"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
