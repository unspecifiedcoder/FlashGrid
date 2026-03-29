// OrderFeed.tsx
// Bottom panel showing a scrolling list of recent OrderPlaced events.
// Each row displays the tick, side (YES/NO), amount, maker address, and block
// number. Rows animate in with the slide-in keyframe from globals.css.
// Uses the neutral TICK_COLORS from types.ts for per-tick color stripes.

"use client";

import { useEffect, useRef } from "react";
import { TICK_LABELS, TICK_COLORS } from "@/lib/types";
import type { LiveOrder } from "@/lib/types";

interface OrderFeedProps {
  orders: LiveOrder[];
}

export default function OrderFeed({ orders }: OrderFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new orders arrive (newest first)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [orders]);

  /** Truncate an Ethereum address for compact display. */
  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
            Live Order Feed
          </h2>
          <span className="live-indicator inline-block h-2 w-2 rounded-full bg-accent-green" />
        </div>
        <span className="text-xs text-content-tertiary">
          {orders.length} orders
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_50px_80px_100px_60px] gap-2 border-b border-border-light px-4 py-2 text-[10px] uppercase tracking-widest text-content-tertiary">
        <span>Tick</span>
        <span>Side</span>
        <span>Amount</span>
        <span>Maker</span>
        <span>Block</span>
      </div>

      {/* Order rows */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-content-secondary">
            No orders yet. Run the load test to start.
          </div>
        ) : (
          orders.map((order, idx) => (
            <div
              key={`${order.id}-${idx}`}
              className="order-row grid grid-cols-[40px_50px_80px_100px_60px] gap-2 border-b border-border-light/50 px-4 py-2 text-xs transition-interactive hover:bg-surface-hover"
            >
              {/* Tick with colored indicator stripe */}
              <div className="flex items-center gap-1">
                <div
                  className="h-3 w-1 rounded-full"
                  style={{ backgroundColor: TICK_COLORS[order.tick] }}
                />
                <span className="text-content-secondary">
                  {TICK_LABELS[order.tick]}
                </span>
              </div>

              {/* Side badge */}
              <span
                className={`font-semibold ${
                  order.side === "YES"
                    ? "text-accent-green"
                    : "text-accent-red"
                }`}
              >
                {order.side}
              </span>

              {/* Amount */}
              <span className="text-content-primary">
                {parseFloat(order.amount).toFixed(4)}
              </span>

              {/* Maker */}
              <span className="font-mono text-content-tertiary">
                {truncateAddress(order.maker)}
              </span>

              {/* Block number */}
              <span className="text-content-tertiary">
                {order.blockNumber}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
