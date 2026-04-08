// Shared TypeScript type definitions for the FlashGrid protocol.
// ── Constants ───────────────────────────────────────────────────
export const NUM_TICKS = 20;
export const TICK_PRICES = Array.from({ length: NUM_TICKS }, (_, i) => ((i + 1) * 5) / 100);
export const TICK_LABELS = TICK_PRICES.map((p) => `$${p.toFixed(2)}`);
//# sourceMappingURL=types.js.map