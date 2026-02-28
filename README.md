# FlashGrid: Parallel Batch Auction Engine on Monad

> A state-sharded order matching engine that settles hundreds of orders per block across isolated price ticks — proving Monad's parallel execution isn't theoretical, it's measurable.

## Architecture

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

## Why State-Sharding Works on Monad

Monad's parallel execution engine detects **storage slot conflicts** at runtime. If two transactions touch the same slot, one re-executes.

- **Traditional AMM**: Every swap touches the same `reserve0`/`reserve1` slots → serial execution
- **FlashGrid**: Orders at tick `0.10` write to `mapping(uint8 => TickState)[10]`, orders at tick `0.50` write to `...[50]` → **zero conflicts** → full parallelism

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Foundry](https://getfoundry.sh/) (for contract compilation/testing)
- Monad testnet MON from [faucet.monad.xyz](https://faucet.monad.xyz)

### 1. Setup

```bash
# Clone the repo
git clone <repo-url>
cd flashgrid

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Install script dependencies
cd scripts && npm install && cd ..

# Install Foundry deps
cd contracts && forge install && cd ..
```

### 2. Configure Environment

```bash
# Copy env example
cp .env.example .env

# Edit .env with your private key and contract addresses
```

### 3. Compile & Test Contracts

```bash
cd contracts
forge build
forge test -vvv
```

### 4. Deploy to Monad Testnet

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast
```

Update `.env` and `dashboard/.env.local` with deployed addresses.

### 5. Run Load Test

```bash
cd scripts

# Fund test wallets
npx tsx fund-wallets.ts

# Run FlashGrid load test
npx tsx load-test.ts sharded

# Run comparison (sharded vs sequential)
npx tsx compare.ts
```

### 6. Launch Dashboard

```bash
cd dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

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
│   │   └── api/                    # Event indexer API routes
│   ├── components/
│   │   ├── Heatmap.tsx             # Order book heatmap (canvas)
│   │   ├── OrderFeed.tsx           # Live event stream
│   │   ├── MetricsPanel.tsx        # Execution gauges + charts
│   │   └── ParallelChart.tsx       # Before/after comparison
│   └── lib/
│       ├── contract.ts             # ABI + addresses
│       ├── indexer.ts              # Event polling + in-memory store
│       └── types.ts                # Shared types
└── plan.md
```

## Smart Contracts

| Contract | Purpose | Key Feature |
|----------|---------|-------------|
| `FlashGrid.sol` | Core order matching engine | 20 isolated tick storage slots |
| `FlashGridFactory.sol` | Market deployer | CREATE2 deterministic deployment |
| `ParallelBenchmark.sol` | Sequential baseline | Single-slot bottleneck for comparison |

### Parallelism Design

| Function | Gas Target | Parallelism |
|----------|-----------|-------------|
| `deposit()` | ~25k | Touches only `balances[msg.sender]` |
| `placeOrder(tick, amount, isYes)` | ~45k | Touches only `ticks[tick]` + `tickOrders[tick]` |
| `settleTick(tick)` | ~80k | Touches only that tick's state |
| `settleAll()` | Loops | Calls `settleTick` per tick — each parallelizable |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Contracts | Solidity 0.8.24 + Foundry |
| Frontend | Next.js 15 + Tailwind + Recharts |
| Chain Interaction | viem |
| Indexer | Next.js API routes + in-memory cache |
| Load Testing | Custom TS scripts with viem |

## Network

| | |
|---|---|
| Network | Monad Testnet |
| RPC | `https://testnet-rpc.monad.xyz` |
| Chain ID | 10143 |
| Symbol | MON |
| Explorer | `https://testnet.monadvision.com` |
| Faucet | `https://faucet.monad.xyz` |

## License

MIT
