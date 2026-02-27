"use client";

import { useEffect, useRef } from "react";
import { TICK_LABELS, TICK_COLORS } from "@/lib/types";
import type { LiveOrder } from "@/lib/types";

interface OrderFeedProps {
  orders: LiveOrder[];
}

export default function OrderFeed({ orders }: OrderFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [orders]);

  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-monad-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Live Order Feed
          </h2>
          <span className="live-indicator inline-block h-2 w-2 rounded-full bg-monad-accent" />
        </div>
        <span className="text-xs text-monad-text">
          {orders.length} orders
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_50px_80px_100px_60px] gap-2 border-b border-monad-border/50 px-4 py-2 text-[10px] uppercase tracking-widest text-monad-text">
        <span>Tick</span>
        <span>Side</span>
        <span>Amount</span>
        <span>Maker</span>
        <span>Block</span>
      </div>

      {/* Order list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-monad-text">
            No orders yet. Run the load test to start.
          </div>
        ) : (
          orders.map((order, idx) => (
            <div
              key={`${order.id}-${idx}`}
              className="order-row grid grid-cols-[40px_50px_80px_100px_60px] gap-2 border-b border-monad-border/20 px-4 py-2 text-xs hover:bg-monad-card/50"
            >
              {/* Tick with color stripe */}
              <div className="flex items-center gap-1">
                <div
                  className="h-3 w-1 rounded-full"
                  style={{ backgroundColor: TICK_COLORS[order.tick] }}
                />
                <span className="text-monad-text">
                  {TICK_LABELS[order.tick]}
                </span>
              </div>

              {/* Side */}
              <span
                className={`font-bold ${
                  order.side === "YES"
                    ? "text-monad-accent"
                    : "text-red-400"
                }`}
              >
                {order.side}
              </span>

              {/* Amount */}
              <span className="text-white">
                {parseFloat(order.amount).toFixed(4)}
              </span>

              {/* Maker */}
              <span className="text-monad-text font-mono">
                {truncateAddress(order.maker)}
              </span>

              {/* Block */}
              <span className="text-monad-text">
                {order.blockNumber}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
