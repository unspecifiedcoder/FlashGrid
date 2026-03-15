// WalletButton.tsx
// Header-bar wallet connection button and connected-state balance display.
// Shows a "Connect Wallet" button when disconnected, and a compact balance
// readout with a disconnect button when connected. Uses the Wallet icon
// from lucide-react instead of inline SVGs.

"use client";

import { Wallet } from "lucide-react";

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
  /** Truncate an Ethereum address for compact display. */
  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // ── Disconnected state ────────────────────────────────────────
  if (!address) {
    return (
      <button
        onClick={onConnect}
        className="flex items-center gap-2 rounded-lg border border-accent-blue bg-accent-blue/8 px-4 py-2 text-sm font-medium text-accent-blue transition-interactive hover:bg-accent-blue/15"
      >
        <Wallet size={16} />
        Connect Wallet
      </button>
    );
  }

  // ── Connected state ───────────────────────────────────────────
  return (
    <div className="flex items-center gap-3">
      {/* Balance readout card */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-xs">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase text-content-tertiary">Wallet</span>
          <span className="font-semibold text-content-primary">
            {parseFloat(monBalance).toFixed(3)} MON
          </span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase text-content-tertiary">In Grid</span>
          <span className="font-semibold text-accent-green">
            {parseFloat(gridBalance).toFixed(3)} MON
          </span>
        </div>
      </div>

      {/* Address chip with disconnect on click */}
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-content-secondary transition-interactive hover:border-accent-red/50 hover:text-accent-red"
        title="Disconnect"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-accent-green" />
        {truncateAddress(address)}
      </button>
    </div>
  );
}
