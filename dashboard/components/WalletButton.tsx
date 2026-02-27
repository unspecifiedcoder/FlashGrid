"use client";

import { useState, useEffect, useCallback } from "react";

interface WalletButtonProps {
  address: string | null;
  monBalance: string;
  gridBalance: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function WalletButton({
  address,
  monBalance,
  gridBalance,
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!address) {
    return (
      <button
        onClick={onConnect}
        className="flex items-center gap-2 rounded-lg border border-monad-purple bg-monad-purple/20 px-4 py-2 text-sm font-medium text-monad-purple transition-all hover:bg-monad-purple/30 hover:shadow-lg hover:shadow-monad-purple/20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 8.5C11 9.05 10.55 9.5 10 9.5C9.45 9.5 9 9.05 9 8.5C9 7.95 9.45 7.5 10 7.5C10.55 7.5 11 7.95 11 8.5Z" fill="currentColor" />
        </svg>
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Balances */}
      <div className="flex items-center gap-2 rounded-lg border border-monad-border bg-monad-card px-3 py-1.5 text-xs">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase text-monad-text">Wallet</span>
          <span className="font-bold text-white">{parseFloat(monBalance).toFixed(3)} MON</span>
        </div>
        <div className="h-6 w-px bg-monad-border" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase text-monad-text">In Grid</span>
          <span className="font-bold text-monad-accent">{parseFloat(gridBalance).toFixed(3)} MON</span>
        </div>
      </div>

      {/* Address + disconnect */}
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 rounded-lg border border-monad-border bg-monad-card px-3 py-2 text-xs text-monad-text transition-all hover:border-red-500/50 hover:text-red-400"
        title="Disconnect"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-monad-accent" />
        {truncate(address)}
      </button>
    </div>
  );
}
