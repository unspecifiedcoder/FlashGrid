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

  // Track settlements for flash effect
  useEffect(() => {
    const now = Date.now();
    for (const s of settlements) {
      flashRef.current.set(s.tick, now);
    }
  }, [settlements]);

  // Push new data into history
  useEffect(() => {
    const now = Date.now();
    const values = tickData.map((t) => {
      const yes = parseFloat(t.yesLiquidity) || 0;
      const no = parseFloat(t.noLiquidity) || 0;
      return yes + no;
    });

    historyRef.current.push({ time: now, ticks: values });

    // Keep 60 seconds of history
    const cutoff = now - 60000;
    historyRef.current = historyRef.current.filter((h) => h.time > cutoff);
  }, [tickData]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = "#0D0B1A";
    ctx.fillRect(0, 0, width, height);

    const history = historyRef.current;
    if (history.length === 0) {
      // Draw empty state
      ctx.fillStyle = "#A89EC8";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "Waiting for orders...",
        width / 2,
        height / 2
      );
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const numCols = Math.min(history.length, 60);
    const cellW = plotW / numCols;
    const cellH = plotH / NUM_TICKS;

    // Find max value for color scaling
    let maxVal = 0.001;
    for (const entry of history) {
      for (const v of entry.ticks) {
        if (v > maxVal) maxVal = v;
      }
    }

    const now = Date.now();

    // Draw cells
    const startIdx = Math.max(0, history.length - numCols);
    for (let col = 0; col < numCols; col++) {
      const entry = history[startIdx + col];
      if (!entry) continue;

      for (let row = 0; row < NUM_TICKS; row++) {
        const value = entry.ticks[row] || 0;
        const intensity = Math.min(value / maxVal, 1);

        const x = padding.left + col * cellW;
        const y = padding.top + (NUM_TICKS - 1 - row) * cellH;

        // Color gradient: dark → blue → purple → red
        let r, g, b;
        if (intensity < 0.25) {
          const t = intensity / 0.25;
          r = Math.floor(13 + t * 17);
          g = Math.floor(11 + t * 30);
          b = Math.floor(26 + t * 80);
        } else if (intensity < 0.5) {
          const t = (intensity - 0.25) / 0.25;
          r = Math.floor(30 + t * 101);
          g = Math.floor(41 + t * 69);
          b = Math.floor(106 + t * 143);
        } else if (intensity < 0.75) {
          const t = (intensity - 0.5) / 0.25;
          r = Math.floor(131 + t * 124);
          g = Math.floor(110 - t * 60);
          b = Math.floor(249 - t * 149);
        } else {
          const t = (intensity - 0.75) / 0.25;
          r = Math.floor(255);
          g = Math.floor(50 + t * 50);
          b = Math.floor(100 - t * 60);
        }

        // Flash effect for settled ticks
        const flashTime = flashRef.current.get(row);
        if (flashTime && now - flashTime < 500) {
          const flashIntensity = 1 - (now - flashTime) / 500;
          r = Math.min(255, r + Math.floor(200 * flashIntensity));
          g = Math.min(255, g + Math.floor(229 * flashIntensity));
          b = Math.min(255, b + Math.floor(160 * flashIntensity));
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        // Hover highlight
        if (
          hoveredCell &&
          hoveredCell.tick === row &&
          col === numCols - 1 - hoveredCell.time
        ) {
          ctx.strokeStyle = "#00E5A0";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellW, cellH);
        }
      }
    }

    // Y-axis labels (tick prices)
    ctx.fillStyle = "#A89EC8";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    for (let i = 0; i < NUM_TICKS; i += 2) {
      const y = padding.top + (NUM_TICKS - 1 - i) * cellH + cellH / 2 + 3;
      ctx.fillText(TICK_LABELS[i], padding.left - 5, y);
    }

    // X-axis labels (time)
    ctx.textAlign = "center";
    ctx.fillText("60s ago", padding.left, height - 5);
    ctx.fillText("now", width - padding.right, height - 5);

    // Title
    ctx.fillStyle = "#e2e0ea";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("ORDER BOOK HEATMAP", padding.left, 18);

    // Live indicator
    ctx.fillStyle = "#00E5A0";
    ctx.beginPath();
    ctx.arc(padding.left + 170, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [hoveredCell]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const plotW = rect.width - padding.left - padding.right;
    const plotH = rect.height - padding.top - padding.bottom;
    const cellW = plotW / 60;
    const cellH = plotH / NUM_TICKS;

    const col = Math.floor((x - padding.left) / cellW);
    const row = NUM_TICKS - 1 - Math.floor((y - padding.top) / cellH);

    if (row >= 0 && row < NUM_TICKS && col >= 0 && col < 60) {
      const history = historyRef.current;
      const idx = history.length - 60 + col;
      const value = idx >= 0 && idx < history.length ? history[idx].ticks[row] : 0;
      setHoveredCell({ tick: row, time: 59 - col, value });
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
      {hoveredCell && (
        <div className="pointer-events-none absolute right-4 top-4 rounded border border-monad-border bg-monad-card px-3 py-2 text-xs">
          <div className="text-monad-text">
            Tick {hoveredCell.tick} ({TICK_LABELS[hoveredCell.tick]})
          </div>
          <div className="text-monad-accent font-bold">
            {hoveredCell.value.toFixed(4)} MON
          </div>
        </div>
      )}
    </div>
  );
}
