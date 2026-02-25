# FlashGrid: Parallel Batch Auction Engine on Monad

> **One-liner**: A state-sharded order matching engine that settles hundreds of orders per block across isolated price ticks — proving Monad's parallel execution isn't theoretical, it's measurable.

---

## Why This Wins

Most Monad hackathon projects *claim* parallelism. FlashGrid **proves** it with receipts:

- **Quantifiable**: Side-by-side block explorer screenshots — 200 orders/block vs sequential chain choking at 15
- **Visual**: Real-time heatmap of order flow across price ticks, each tick processing independently
- **Narratively tight**: One core thesis ("state-sharded order books unlock parallel settlement") demonstrated end-to-end
- **DeFi-native**: Not a toy — this is the architecture serious CLOB DEXs will use on Monad

The original SignalLayer plan spreads across too many surfaces (prediction markets + OSINT + whale tracking + narrative feeds). Judges remember **one thing**. Make that one thing undeniable.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FlashGrid                         │
│                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ Tick 0.10│   │ Tick 0.25│   │ Tick 0.50│  ...    │  ← Each tick = isolated state
│  │ [orders] │   │ [orders] │   │ [orders] │         │    No storage conflicts
│  └────┬─────┘   └────┬─────┘   └────┬─────┘        │    Monad executes in parallel
│       │              │              │                │
│       ▼              ▼              ▼                │
│  ┌─────────────────────────────────────────┐        │
│  │         BatchSettlement.sol              │        │
│  │   Epoch-based: collect → match → settle │        │
│  └─────────────────────────────────────────┘        │
│                      │                               │
│                      ▼                               │
│  ┌─────────────────────────────────────────┐        │
│  │         Events → Indexer → Dashboard     │        │
│  │   Real-time parallel execution metrics   │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

### Why State-Sharding Works on Monad

Monad's parallel execution engine detects **storage slot conflicts** at runtime. If two transactions touch the same slot, one re-executes. The key insight:

- **Traditional AMM**: Every swap touches the same `reserve0` / `reserve1` slots → serial execution
- **FlashGrid**: Orders at tick `0.10` write to `mapping(uint8 => TickState)[10]`, orders at tick `0.50` write to `...[50]` → **zero conflicts** → full parallelism

This isn't a hack. This is how high-performance order books will actually work on Monad in production.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Contracts** | Solidity 0.8.24 + Foundry | Fastest compile/test/deploy cycle |
| **Frontend** | Next.js 15 + Tailwind + Recharts | App Router, server components for initial load |
| **Chain Interaction** | viem | WebSocket subscriptions, batch calls, TypeScript-native |
| **Indexer** | Next.js API routes + in-memory event cache | Zero infra overhead for hackathon |
| **Load Testing** | Custom TS script with viem | Spawn wallets, blast orders, measure block packing |
| **Visualization** | Custom heatmap (canvas) + Recharts | The money shot for the demo |

---

## Smart Contracts (~200 LOC total)

### Contract 1: `FlashGrid.sol` — The Core Engine

```
State Design (optimized for parallel execution):

mapping(uint8 => TickState) public ticks;     // 20 price ticks: 0.05 to 1.00
mapping(uint8 => Order[]) public tickOrders;  // orders per tick (isolated arrays)
mapping(address => uint256) public balances;   // deposit/withdrawal ledger

struct TickState {
    uint128 totalYesLiquidity;
    uint128 totalNoLiquidity;
    uint32  orderCount;
    uint32  lastMatchedEpoch;
}

struct Order {
    address maker;
    uint128 amount;
    bool    isYes;
    uint32  epoch;
}
```

**Key functions:**

| Function | Gas Target | Parallelism |
|----------|-----------|-------------|
| `deposit()` | ~25k | Touches only `balances[msg.sender]` |
| `placeOrder(tick, amount, isYes)` | ~45k | Touches only `ticks[tick]` + `tickOrders[tick]` |
| `settleTick(tick)` | ~80k | Touches only that tick's state |
| `settleAll()` | Loops | Calls `settleTick` per tick — each parallelizable |

**Events:**

```solidity
event OrderPlaced(uint8 indexed tick, address indexed maker, uint128 amount, bool isYes, uint32 epoch);
event TickSettled(uint8 indexed tick, uint32 epoch, uint128 yesMatched, uint128 noMatched, uint256 clearingPrice);
event EpochCompleted(uint32 epoch, uint256 totalVolume, uint16 ticksActive);
```

### Contract 2: `FlashGridFactory.sol` (~40 LOC)

Deploys new FlashGrid instances for different markets. Minimal — just a CREATE2 deployer with a registry.

### Contract 3: `ParallelBenchmark.sol` (~30 LOC, optional)

A dummy contract that intentionally creates storage conflicts (single-slot counter) for the **before/after comparison**. Deploy this, run the same load test, show the difference. This is the "wow" moment in the demo.

---

## Load Test Script — The Proof

This is the most important non-contract artifact. It produces the numbers judges remember.

### `scripts/load-test.ts`

```
Workflow:
1. Generate 200 funded wallets (derive from single mnemonic)
2. Fund all wallets via batch transfer (1 tx from deployer)
3. Each wallet deposits to FlashGrid
4. Each wallet places 1 order at a RANDOM tick (0-19)
   → Orders spread across ticks = different storage slots = parallel
5. Measure:
   - Orders packed per block
   - Tx success rate
   - Avg latency (submission → confirmation)
   - Block utilization
6. Compare against ParallelBenchmark.sol (same wallets, single-slot writes)
   → Sequential bottleneck visible
7. Output formatted results table
```

**Expected output:**

```
╔══════════════════════════════════════════════════════╗
║             FlashGrid Parallelism Report             ║
╠══════════════════════════════════════════════════════╣
║ State-Sharded (FlashGrid)                            ║
║   Orders submitted:    200                           ║
║   Blocks used:         2                             ║
║   Orders/block:        ~100                          ║
║   Success rate:        100%                          ║
║   Avg latency:         420ms                         ║
╠══════════════════════════════════════════════════════╣
║ Single-Slot Baseline (sequential)                    ║
║   Orders submitted:    200                           ║
║   Blocks used:         8-12                          ║
║   Orders/block:        ~20                           ║
║   Success rate:        100%                          ║
║   Avg latency:         1800ms                        ║
╠══════════════════════════════════════════════════════╣
║ Parallel Speedup:      ~5x                           ║
╚══════════════════════════════════════════════════════╝
```

This table alone wins you the parallelism category.

---

## Frontend Dashboard

### Layout (Single Page, 4 Panels)

```
┌─────────────────────────────────────┬──────────────────┐
│                                     │                  │
│     ORDER BOOK HEATMAP              │  EXECUTION       │
│     (20 ticks × time)              │  METRICS         │
│     Color = liquidity depth         │                  │
│     Animated fills on match         │  Orders/block    │
│                                     │  Latency         │
│                                     │  Success rate    │
│                                     │  Active ticks    │
├─────────────────────────────────────┼──────────────────┤
│                                     │                  │
│     LIVE ORDER FEED                 │  PARALLELISM     │
│     Streaming event log             │  COMPARISON      │
│     Color-coded by tick             │                  │
│     Maker address (truncated)       │  Bar chart:      │
│                                     │  Sharded vs      │
│                                     │  Sequential      │
│                                     │                  │
└─────────────────────────────────────┴──────────────────┘
```

### Components

1. **Heatmap** (Canvas-based, 60fps)
   - X-axis: time (rolling 60s window)
   - Y-axis: 20 price ticks
   - Cell color: blue (low liquidity) → red (high liquidity)
   - Flash animation on `TickSettled` events

2. **Execution Metrics** (Recharts)
   - Real-time line chart: orders/block over time
   - Gauges: success rate, avg latency
   - Counter: total orders processed

3. **Live Order Feed** (Virtualized list)
   - WebSocket subscription to `OrderPlaced` events
   - Each row: `[tick] [side] [amount] [maker] [block]`
   - Color stripe matching tick position

4. **Parallelism Comparison** (Bar chart)
   - Pre-loaded data from load test
   - Two bars per metric: FlashGrid vs Sequential baseline
   - The visual "before/after" that tells the story

---

## Build Timeline (3 Days)

### Day 0: Foundation (2-3 hours)

- [ ] Monad testnet wallet + fund with test MON
- [ ] `forge init flashgrid && cd flashgrid`
- [ ] `npx create-next-app@latest dashboard --typescript --tailwind --app`
- [ ] Verify deployment: deploy a dummy contract, confirm on explorer
- [ ] Install deps: `viem`, `recharts`, `@shadcn/ui`

### Day 1: Contracts + Load Test (Full Day)

**Morning — Contracts:**
- [ ] Write `FlashGrid.sol` with tick-isolated state design
- [ ] Write `FlashGridFactory.sol`
- [ ] Write `ParallelBenchmark.sol` (single-slot baseline)
- [ ] Foundry tests: deposit, place order, settle tick, settle all
- [ ] Deploy all contracts to Monad testnet

**Afternoon — Load Test:**
- [ ] Write `load-test.ts`: wallet generation, funding, order blasting
- [ ] Run against FlashGrid (state-sharded) — record results
- [ ] Run against ParallelBenchmark (sequential) — record results
- [ ] Format comparison table — **screenshot this immediately**
- [ ] Iterate if numbers aren't clean (adjust tick count, order distribution)

**Day 1 Gate**: You must have the parallelism comparison numbers before moving on. This is the project's thesis — everything else is presentation.

### Day 2: Indexer + Frontend Shell (Full Day)

**Morning — Event Indexer:**
- [ ] Next.js API route: WebSocket subscription to FlashGrid events
- [ ] In-memory event store (last 1000 events, ring buffer)
- [ ] REST endpoints: `/api/events`, `/api/metrics`, `/api/ticks`

**Afternoon — Dashboard:**
- [ ] Layout scaffold (4-panel grid)
- [ ] Heatmap component (start with Recharts heatmap, upgrade to canvas if time)
- [ ] Live order feed (subscribe to events via polling or SSE)
- [ ] Parallelism comparison chart (static data from Day 1)
- [ ] Execution metrics panel

### Day 3: Integration + Demo Prep (Half Day)

- [ ] Connect dashboard to live contract events
- [ ] Add "Run Load Test" button that triggers the script visually
- [ ] Polish: animations, transitions, loading states
- [ ] Record 2-minute demo video:
  1. Show empty order book (5s)
  2. Click "Run Load Test" — watch 200 orders flood in (20s)
  3. Show parallelism comparison chart (10s)
  4. Explain architecture in 30s
  5. Show code structure (10s)
- [ ] Write README with architecture diagram
- [ ] Prepare 3-slide pitch:
  - Slide 1: The problem (sequential bottleneck in on-chain order books)
  - Slide 2: The solution (state-sharded ticks → parallel settlement)
  - Slide 3: The proof (load test numbers + live demo)

---

## Monad-Specific Details

### Network Config

```
Network:     Monad Testnet
RPC:         https://testnet-rpc.monad.xyz
Chain ID:    10143
Symbol:      MON
Explorer:    https://testnet.monadvision.com
Faucet:      https://faucet.monad.xyz
```

### Parallelism Optimization Checklist

- [ ] Each tick uses its own storage slot range (no shared counters in hot path)
- [ ] `balances` mapping only touched on deposit/withdraw, not during order placement
- [ ] `settleTick(tick)` reads/writes ONLY `ticks[tick]` and `tickOrders[tick]`
- [ ] No global sequence numbers or nonce counters in order placement
- [ ] Events are the only cross-tick data (events don't cause conflicts)

### What NOT to Do

- **Don't use a single `orders[]` array** — all inserts conflict on `array.length`
- **Don't increment a global `orderId++`** — single-slot bottleneck
- **Don't use `block.timestamp` comparisons in hot path** — it's fine, but don't use it as a mutex
- **Don't over-engineer**: 20 fixed ticks is enough. Dynamic tick creation adds complexity with no hackathon payoff

---

## File Structure

```
flashgrid/
├── contracts/
│   ├── src/
│   │   ├── FlashGrid.sol           # Core engine (~130 LOC)
│   │   ├── FlashGridFactory.sol    # Market deployer (~40 LOC)
│   │   └── ParallelBenchmark.sol   # Sequential baseline (~30 LOC)
│   ├── test/
│   │   └── FlashGrid.t.sol         # Foundry tests
│   ├── script/
│   │   └── Deploy.s.sol            # Deployment script
│   └── foundry.toml
├── scripts/
│   ├── load-test.ts                # 200-wallet parallel load test
│   ├── fund-wallets.ts             # Batch fund test wallets
│   └── compare.ts                  # Run both tests + format results
├── dashboard/
│   ├── app/
│   │   ├── page.tsx                # Main 4-panel dashboard
│   │   └── api/
│   │       ├── events/route.ts     # Event stream endpoint
│   │       ├── metrics/route.ts    # Aggregated metrics
│   │       └── ticks/route.ts      # Current tick state
│   ├── components/
│   │   ├── Heatmap.tsx             # Order book heatmap
│   │   ├── OrderFeed.tsx           # Live event stream
│   │   ├── MetricsPanel.tsx        # Execution gauges
│   │   └── ParallelChart.tsx       # Before/after comparison
│   └── lib/
│       ├── contract.ts             # ABI + addresses
│       ├── indexer.ts              # WebSocket event listener
│       └── types.ts                # Shared types
├── README.md
└── plan.md                         # This file
```

---

## Cost

**$0**. Everything runs on Monad testnet. No API keys required unless you want to add an LLM narrative layer (Groq free tier is fine for that).

---

## Judging Angles

| Criterion | FlashGrid's Answer |
|-----------|--------------------|
| **Technical depth** | State-sharded contract design with formal parallelism guarantees |
| **Monad-native** | Impossible to replicate on sequential EVM — the architecture IS the Monad thesis |
| **Measurable** | Load test produces hard numbers: orders/block, latency, speedup factor |
| **Visual** | Real-time heatmap + live order feed + comparison chart |
| **Practical** | This is how production CLOB DEXs will work on Monad |
| **Presentation** | 3 slides, 2-minute demo, one clear narrative |

---

## Stretch Goals (If Time Permits)

1. **MEV Resistance**: Batch auction epochs where orders are sealed until settlement → no frontrunning
2. **Cross-Tick Arbitrage Bot**: A simple bot that detects mispricing between ticks and arbs it — all in parallel
3. **Gas Profiling**: Foundry `--gas-report` showing per-function costs, annotated on the dashboard
4. **Multi-Market View**: Deploy 3 markets via factory, show all running in parallel on one dashboard
5. **ZK Order Privacy**: Commit-reveal scheme where orders are hashed on submission, revealed at settlement (plays to your ZK expertise — but only if core is solid first)

---

## Key Principle

> **Depth over breadth.** One contract that provably runs 5x faster on Monad beats five contracts that "could theoretically" benefit from parallelism. Ship the proof, not the promise.
