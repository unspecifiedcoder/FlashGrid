// DemoPanel.tsx
// Left-column panel that runs a server-side demo sequence on Monad testnet.
// Offers "Quick Demo" (10 orders, ~30s) and "Full Demo" (20 orders, ~60s).
// Uses lucide-react icons for play buttons and loading spinner. No wallet
// connection required — the server uses the deployer private key.

"use client";

import { useState } from "react";
import { Play, Zap, Loader2, RotateCcw } from "lucide-react";

interface DemoResult {
  success: boolean;
  mode: string;
  steps: Array<{ step: string; hash: string; status: string }>;
  totalTransactions: number;
  finalEpoch: number;
  ticksWithOrders: number;
}

export default function DemoPanel({ onComplete }: { onComplete?: () => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const runDemo = async (mode: "quick" | "full") => {
    setRunning(true);
    setResult(null);
    setError(null);
    setElapsed(0);

    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Demo failed");
      }

      setResult(data);
      onComplete?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(timer);
      setElapsed(Math.floor((Date.now() - start) / 1000));
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
          Demo Mode
        </h2>
        <p className="mt-0.5 text-[10px] text-content-tertiary">
          Run a full demo sequence on Monad testnet - no wallet needed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ── Idle state: show demo buttons ──────────────────────── */}
        {!running && !result && !error && (
          <div className="space-y-4">
            {/* Quick demo card */}
            <button
              onClick={() => runDemo("quick")}
              className="w-full rounded-lg border border-accent-blue/40 bg-accent-blue/5 p-4 text-left transition-interactive hover:bg-accent-blue/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-accent-blue">
                    Quick Demo
                  </div>
                  <div className="mt-1 text-[10px] text-content-secondary">
                    Deposit + 10 orders across 5 ticks + settle
                    <br />
                    ~12 transactions, ~30 seconds
                  </div>
                </div>
                <Play size={22} className="text-accent-blue" />
              </div>
            </button>

            {/* Full demo card */}
            <button
              onClick={() => runDemo("full")}
              className="w-full rounded-lg border border-accent-green/40 bg-accent-green/5 p-4 text-left transition-interactive hover:bg-accent-green/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-accent-green">
                    Full Demo
                  </div>
                  <div className="mt-1 text-[10px] text-content-secondary">
                    Deposit + 20 orders across 10 ticks + settle
                    <br />
                    ~22 transactions, ~60 seconds
                  </div>
                </div>
                <Zap size={22} className="text-accent-green" />
              </div>
            </button>

            {/* Explanation box */}
            <div className="rounded-lg border border-border-light bg-surface-secondary p-3 text-[10px] leading-relaxed text-content-secondary">
              <strong className="text-content-primary">What happens:</strong>
              <br />
              1. Deposits MON into FlashGrid contract
              <br />
              2. Places YES and NO orders across multiple price ticks
              <br />
              3. Settles all ticks in one transaction (parallel on Monad)
              <br />
              4. Watch the heatmap and order feed update live!
              <br />
              <br />
              Uses deployer wallet server-side. The heatmap will light up
              as orders flow in.
            </div>
          </div>
        )}

        {/* ── Running state ──────────────────────────────────────── */}
        {running && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 size={40} className="mb-4 animate-spin text-accent-blue" />
            <div className="text-sm font-semibold text-content-primary">
              Running Demo...
            </div>
            <div className="mt-1 text-xs text-content-tertiary">
              {elapsed}s elapsed - sending transactions to Monad testnet
            </div>
            <div className="mt-4 w-full space-y-1">
              {[
                "Depositing MON...",
                "Placing orders across ticks...",
                "Settling all ticks...",
              ].map((step, i) => (
                <div
                  key={step}
                  className={`rounded px-3 py-1.5 text-[10px] ${
                    elapsed > i * 10
                      ? "bg-accent-blue/8 text-accent-blue"
                      : "text-content-tertiary"
                  }`}
                >
                  {elapsed > i * 10 ? ">" : " "} {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results ────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-3">
            {/* Success banner */}
            <div className="rounded-lg border border-accent-green/30 bg-accent-green/8 p-3 text-center">
              <div className="text-sm font-semibold text-accent-green">
                Demo Complete
              </div>
              <div className="mt-1 text-[10px] text-content-secondary">
                {result.totalTransactions} transactions in {elapsed}s
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border-light bg-surface-secondary p-2 text-center">
                <div className="text-lg font-semibold text-content-primary">
                  {result.totalTransactions}
                </div>
                <div className="text-[9px] text-content-tertiary">Transactions</div>
              </div>
              <div className="rounded-lg border border-border-light bg-surface-secondary p-2 text-center">
                <div className="text-lg font-semibold text-accent-blue">
                  {result.ticksWithOrders}
                </div>
                <div className="text-[9px] text-content-tertiary">Ticks Used</div>
              </div>
              <div className="rounded-lg border border-border-light bg-surface-secondary p-2 text-center">
                <div className="text-lg font-semibold text-accent-green">
                  {result.finalEpoch}
                </div>
                <div className="text-[9px] text-content-tertiary">Current Epoch</div>
              </div>
              <div className="rounded-lg border border-border-light bg-surface-secondary p-2 text-center">
                <div className="text-lg font-semibold text-content-primary">
                  {elapsed}s
                </div>
                <div className="text-[9px] text-content-tertiary">Total Time</div>
              </div>
            </div>

            {/* Transaction log */}
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-widest text-content-tertiary">
                Transaction Log
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border-light">
                {result.steps.map((step, i) => (
                  <a
                    key={i}
                    href={`https://testnet.monadvision.com/tx/${step.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border-b border-border-light px-3 py-1.5 text-[10px] last:border-b-0 transition-interactive hover:bg-surface-hover"
                  >
                    <span className="text-content-secondary">{step.step}</span>
                    <span className="font-mono text-accent-blue">
                      {step.hash.slice(0, 8)}...
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Run again button */}
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs text-content-secondary transition-interactive hover:border-accent-blue hover:text-accent-blue"
            >
              <RotateCcw size={14} />
              Run Another Demo
            </button>
          </div>
        )}

        {/* ── Error state ────────────────────────────────────────── */}
        {error && !running && (
          <div className="space-y-3">
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/8 p-3 text-center">
              <div className="text-sm font-semibold text-accent-red">
                Demo Failed
              </div>
              <div className="mt-1 text-[10px] text-content-secondary">
                {error}
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                setResult(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs text-content-secondary transition-interactive hover:border-accent-blue hover:text-accent-blue"
            >
              <RotateCcw size={14} />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
