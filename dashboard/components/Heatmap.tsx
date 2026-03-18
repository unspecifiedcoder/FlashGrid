// Heatmap.tsx
// Canvas-based real-time heatmap showing order liquidity across all 20 price
// ticks over the last 60 seconds. Each cell's color intensity maps to the total
// (YES + NO) liquidity at that tick at that moment. Uses a neutral blue-teal
// gradient on a white background — no purple, no glow effects.

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { NUM_TICKS, TICK_LABELS } from "@/lib/types";

interface HeatmapProps {
  tickData: Array<{
    index: number;
    yesLiquidity: string;
    noLiquidity: string;
    orderCount: number;
  }>;
  settlements: Array<{ tick: number; timestamp: number }>;
}

interface HistoryEntry {
  time: number;
  ticks: number[];
}

function getVisibleColumnCount(historyLength: number): number {
  return Math.max(1, Math.min(historyLength, 60));
}

function formatHeatmapAge(columnOffsetFromLatest: number): string {
  if (columnOffsetFromLatest <= 0) {
    return "now";
  }

  return `${columnOffsetFromLatest}s ago`;
}

export default function Heatmap({ tickData, settlements }: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const flashRef = useRef<Map<number, number>>(new Map());
  const animFrameRef = useRef<number>(0);
  const [hoveredCell, setHoveredCell] = useState<{
    tick: number;
    time: number;
    value: number;
  } | null>(null);

  // Track settlements for a brief flash highlight
  useEffect(() => {
    const now = Date.now();
    for (const s of settlements) {
      flashRef.current.set(s.tick, now);
    }
  }, [settlements]);

  // Push current tick data into the rolling history buffer
  useEffect(() => {
    const now = Date.now();
    const values = tickData.map((t) => {
      const yes = parseFloat(t.yesLiquidity) || 0;
      const no = parseFloat(t.noLiquidity) || 0;
      return yes + no;
    });

    historyRef.current.push({ time: now, ticks: values });

    // Keep only the most recent 60 seconds of snapshots
    const cutoff = now - 60000;
    historyRef.current = historyRef.current.filter((h) => h.time > cutoff);
  }, [tickData]);

  // ── Canvas draw loop ──────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle HiDPI / Retina displays
    const rect = canvas.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Clear to white (light theme background)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const history = historyRef.current;
    if (history.length === 0) {
      // Empty state message
      ctx.fillStyle = "#86868B"; // content-tertiary
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for orders...", width / 2, height / 2);
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const numberOfColumns = getVisibleColumnCount(history.length);
    const cellWidth = plotWidth / numberOfColumns;
    const cellHeight = plotHeight / NUM_TICKS;

    // Determine the max value across all history for normalization
    let maxValue = 0.001;
    for (const entry of history) {
      for (const v of entry.ticks) {
        if (v > maxValue) maxValue = v;
      }
    }

    const now = Date.now();

    // Draw each cell with a neutral blue-teal gradient
    const startIndex = Math.max(0, history.length - numberOfColumns);
    for (let col = 0; col < numberOfColumns; col++) {
      const entry = history[startIndex + col];
      if (!entry) continue;

      for (let row = 0; row < NUM_TICKS; row++) {
        const value = entry.ticks[row] || 0;
        const intensity = Math.min(value / maxValue, 1);

        const x = padding.left + col * cellWidth;
        const y = padding.top + (NUM_TICKS - 1 - row) * cellHeight;

        // Color gradient on a light background:
        // intensity 0.00 → near-white (#F5F5F7)
        // intensity 0.25 → light blue (#C8DEE8)
        // intensity 0.50 → medium teal (#5AACBE)
        // intensity 0.75 → deep teal (#2490A8)
        // intensity 1.00 → dark blue-teal (#0A6E88)
        let r: number, g: number, b: number;
        if (intensity < 0.25) {
          const t = intensity / 0.25;
          r = Math.floor(245 - t * 45);  // 245 → 200
          g = Math.floor(245 - t * 23);  // 245 → 222
          b = Math.floor(247 - t * 15);  // 247 → 232
        } else if (intensity < 0.5) {
          const t = (intensity - 0.25) / 0.25;
          r = Math.floor(200 - t * 110); // 200 → 90
          g = Math.floor(222 - t * 50);  // 222 → 172
          b = Math.floor(232 - t * 42);  // 232 → 190
        } else if (intensity < 0.75) {
          const t = (intensity - 0.5) / 0.25;
          r = Math.floor(90 - t * 54);   // 90 → 36
          g = Math.floor(172 - t * 28);  // 172 → 144
          b = Math.floor(190 - t * 22);  // 190 → 168
        } else {
          const t = (intensity - 0.75) / 0.25;
          r = Math.floor(36 - t * 26);   // 36 → 10
          g = Math.floor(144 - t * 34);  // 144 → 110
          b = Math.floor(168 - t * 32);  // 168 → 136
        }

        // Flash effect for recently settled ticks (white flash that fades)
        const flashTime = flashRef.current.get(row);
        if (flashTime && now - flashTime < 500) {
          const flashIntensity = 1 - (now - flashTime) / 500;
          r = Math.min(255, r + Math.floor((255 - r) * flashIntensity * 0.6));
          g = Math.min(255, g + Math.floor((255 - g) * flashIntensity * 0.6));
          b = Math.min(255, b + Math.floor((255 - b) * flashIntensity * 0.6));
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);

        // Hover highlight ring
        if (
          hoveredCell &&
          hoveredCell.tick === row &&
          col === numberOfColumns - 1 - hoveredCell.time
        ) {
          ctx.strokeStyle = "#0071E3"; // accent-blue
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellWidth, cellHeight);
        }
      }
    }

    // Y-axis labels (tick prices)
    ctx.fillStyle = "#6E6E73"; // content-secondary
    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i < NUM_TICKS; i += 2) {
      const y = padding.top + (NUM_TICKS - 1 - i) * cellHeight + cellHeight / 2 + 3;
      ctx.fillText(TICK_LABELS[i], padding.left - 5, y);
    }

    // X-axis time labels
    ctx.textAlign = "center";
    ctx.fillText("60s ago", padding.left, height - 5);
    ctx.fillText("now", width - padding.right, height - 5);

    // Title
    ctx.fillStyle = "#1D1D1F"; // content-primary
    ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ORDER BOOK HEATMAP", padding.left, 18);

    // Live indicator dot
    ctx.fillStyle = "#34C759"; // accent-green
    ctx.beginPath();
    ctx.arc(padding.left + 160, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [hoveredCell]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // ── Mouse hover tracking for tooltip ──────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const plotWidth = rect.width - padding.left - padding.right;
    const plotHeight = rect.height - padding.top - padding.bottom;
    const visibleColumnCount = getVisibleColumnCount(historyRef.current.length);
    const cellWidth = plotWidth / visibleColumnCount;
    const cellHeight = plotHeight / NUM_TICKS;

    const col = Math.floor((x - padding.left) / cellWidth);
    const row = NUM_TICKS - 1 - Math.floor((y - padding.top) / cellHeight);

    if (row >= 0 && row < NUM_TICKS && col >= 0 && col < visibleColumnCount) {
      const history = historyRef.current;
      const idx = history.length - visibleColumnCount + col;
      const value = idx >= 0 && idx < history.length ? history[idx].ticks[row] : 0;
      setHoveredCell({ tick: row, time: visibleColumnCount - 1 - col, value });
    } else {
      setHoveredCell(null);
    }
  };

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCell(null)}
      />
      {/* Floating tooltip card */}
      {hoveredCell && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-border bg-surface-primary px-3 py-2 text-xs shadow-sm">
          <div className="text-content-secondary">
            Tick {hoveredCell.tick} ({TICK_LABELS[hoveredCell.tick]})
          </div>
          <div className="text-[10px] text-content-tertiary">
            {formatHeatmapAge(hoveredCell.time)}
          </div>
          <div className="font-semibold text-accent-blue">
            {hoveredCell.value.toFixed(4)} MON
          </div>
        </div>
      )}
    </div>
  );
}
