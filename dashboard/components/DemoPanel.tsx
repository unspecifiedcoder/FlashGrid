"use client";

import { useState } from "react";

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
      <div className="border-b border-monad-border px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Demo Mode
        </h2>
        <p className="mt-0.5 text-[10px] text-monad-text">
          Run a full demo sequence on Monad testnet - no wallet needed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!running && !result && (
          <div className="space-y-4">
            {/* Quick demo */}
            <button
              onClick={() => runDemo("quick")}
              className="w-full rounded-lg border border-monad-purple bg-monad-purple/20 p-4 text-left transition-all hover:bg-monad-purple/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-monad-purple">
                    Quick Demo
                  </div>
                  <div className="mt-1 text-[10px] text-monad-text">
                    Deposit + 10 orders across 5 ticks + settle
                    <br />
                    ~12 transactions, ~30 seconds
                  </div>
                </div>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-monad-purple"
                >
                  <path
                    d="M8 5v14l11-7z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </button>

            {/* Full demo */}
            <button
              onClick={() => runDemo("full")}
              className="w-full rounded-lg border border-monad-accent/50 bg-monad-accent/10 p-4 text-left transition-all hover:bg-monad-accent/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-monad-accent">
                    Full Demo
                  </div>
                  <div className="mt-1 text-[10px] text-monad-text">
                    Deposit + 20 orders across 10 ticks + settle
                    <br />
                    ~22 transactions, ~60 seconds
                  </div>
                </div>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-monad-accent"
                >
                  <path
                    d="M8 5v14l11-7z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </button>

            {/* Info */}
            <div className="rounded-lg border border-monad-border/30 bg-monad-card/20 p-3 text-[10px] leading-relaxed text-monad-text">
              <strong className="text-white">What happens:</strong>
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

        {/* Running state */}
        {running && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-monad-purple/30 border-t-monad-purple" />
            <div className="text-sm font-bold text-white">
              Running Demo...
            </div>
            <div className="mt-1 text-xs text-monad-text">
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
                      ? "bg-monad-purple/10 text-monad-purple"
                      : "text-monad-text"
                  }`}
                >
                  {elapsed > i * 10 ? ">" : " "} {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-monad-accent/30 bg-monad-accent/10 p-3 text-center">
              <div className="text-sm font-bold text-monad-accent">
                Demo Complete!
              </div>
              <div className="mt-1 text-[10px] text-monad-text">
                {result.totalTransactions} transactions in {elapsed}s
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-monad-border/30 bg-monad-card/20 p-2 text-center">
                <div className="text-lg font-bold text-white">
                  {result.totalTransactions}
                </div>
                <div className="text-[9px] text-monad-text">Transactions</div>
              </div>
              <div className="rounded-lg border border-monad-border/30 bg-monad-card/20 p-2 text-center">
                <div className="text-lg font-bold text-monad-purple">
                  {result.ticksWithOrders}
                </div>
                <div className="text-[9px] text-monad-text">Ticks Used</div>
              </div>
              <div className="rounded-lg border border-monad-border/30 bg-monad-card/20 p-2 text-center">
                <div className="text-lg font-bold text-monad-accent">
                  {result.finalEpoch}
                </div>
                <div className="text-[9px] text-monad-text">Current Epoch</div>
              </div>
              <div className="rounded-lg border border-monad-border/30 bg-monad-card/20 p-2 text-center">
                <div className="text-lg font-bold text-white">
                  {elapsed}s
                </div>
                <div className="text-[9px] text-monad-text">Total Time</div>
              </div>
            </div>

            {/* Transaction list */}
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-widest text-monad-text">
                Transaction Log
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-monad-border/30">
                {result.steps.map((step, i) => (
                  <a
                    key={i}
                    href={`https://testnet.monadvision.com/tx/${step.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border-b border-monad-border/20 px-3 py-1.5 text-[10px] last:border-b-0 hover:bg-monad-card/30"
                  >
                    <span className="text-monad-text">{step.step}</span>
                    <span className="font-mono text-monad-purple">
                      {step.hash.slice(0, 8)}...
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Run again */}
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="w-full rounded-lg border border-monad-border py-2 text-xs text-monad-text hover:border-monad-purple hover:text-monad-purple"
            >
              Run Another Demo
            </button>
          </div>
        )}

        {/* Error */}
        {error && !running && (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center">
              <div className="text-sm font-bold text-red-400">
                Demo Failed
              </div>
              <div className="mt-1 text-[10px] text-red-300">
                {error}
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                setResult(null);
              }}
              className="w-full rounded-lg border border-monad-border py-2 text-xs text-monad-text hover:border-monad-purple hover:text-monad-purple"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
