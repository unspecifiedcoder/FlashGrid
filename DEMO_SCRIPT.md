# FlashGrid - Hackathon Demo Script

**Duration:** 5-7 minutes
**Prerequisites:** Dashboard running at localhost:3000, MetaMask optional

---

## OPENING (30 seconds)

> Every DEX on EVM today has the same bottleneck. When two trades happen at the same time, they both touch the same storage slots - `reserve0`, `reserve1` - so the chain has to run them one after another. Even on Monad, which has a parallel execution engine, these trades get serialized because of storage conflicts.
>
> FlashGrid fixes this. We built a batch auction engine where every price level has its own isolated storage. Tick 0 never touches Tick 1's data. Tick 5 never touches Tick 9's data. Monad detects this at runtime and executes them all at once.
>
> The result: 5x more orders processed per block compared to a traditional single-slot design. Let me show you.

---

## PART 1: THE ARCHITECTURE (1 minute)

*Open the dashboard. Point to the layout.*

> This is FlashGrid running live on Monad testnet. Let me walk through what you're looking at.
>
> **The core idea is simple.** We have 20 price ticks, from $0.05 to $1.00, each representing a probability level. Think of it as a prediction market: "Will MON reach $10 by Q2 2025?" You can bet YES or NO at any price point.
>
> **The key innovation is in the storage layout.** In the smart contract, each tick maps to its own `TickState` struct and its own `Order[]` array. In Solidity terms:

```
mapping(uint8 => TickState) ticks;     // tick 0 -> slot X, tick 1 -> slot Y, ...
mapping(uint8 => Order[]) tickOrders;  // completely separate storage per tick
```

> When two users place orders at different ticks, they touch completely different storage slots. Monad's parallel execution engine sees zero conflicts and runs them simultaneously. That's the whole trick.

---

## PART 2: LIVE DEMO - WALLET INTERACTION (1.5 minutes)

*If MetaMask is available, do this section. Otherwise skip to Part 3.*

> Let me connect my wallet and interact with the contract directly.

1. **Click "Connect Wallet"** in the top right
2. MetaMask prompts to switch to Monad Testnet (Chain ID 10143) - approve it

> Now I'm connected. You can see my wallet balance and my "In Grid" balance - that's how much MON I've deposited into the FlashGrid contract.

3. **Go to the Trade tab.** Deposit 0.1 MON.

> This calls the `deposit()` function. The contract now holds my MON and I can use it to place orders.

4. **Switch to "Place Order" sub-tab.** Select YES, pick tick $0.50, enter 0.01 MON. Click "Place YES Order."

> This writes one order to tick 9's storage. Only `ticks[9]` and `tickOrders[9]` are touched. No other tick is affected. That isolation is what enables parallelism.

5. **Place a NO order at the same tick** to create matching liquidity.

> Now tick 9 has both YES and NO liquidity. It's ready to settle.

6. **Go to the Settle tab.** Click "Settle" next to tick $0.50.

> The `settleTick` function matches YES and NO liquidity pro-rata. Winners get paid, unmatched amounts get refunded. Notice only that one tick was affected - all other ticks remain untouched.

*Point to the Recent Transactions section at the bottom of the left panel.*

> Every transaction links to the Monad block explorer. These are real on-chain transactions, not simulations.

---

## PART 3: THE DEMO BUTTON (1.5 minutes)

*This is the main demo for judges without MetaMask.*

> Now let me show you what happens at scale. I'm going to run a full demo sequence that deposits funds, places 10 orders across 5 different ticks, and settles everything - all on-chain.

1. **Click the "Demo" tab** in the left sidebar
2. **Click "Quick Demo"**

> This runs 12 transactions server-side using the deployer wallet. Watch the heatmap on the right - you'll see it light up as orders flow in.

*While it runs (~30 seconds), explain:*

> What's happening right now:
> - First it deposits 0.2 MON into the contract
> - Then it places YES and NO orders across 5 different ticks: tick 0, 2, 4, 6, and 9
> - Each order goes to a different storage slot
> - Finally it calls `settleAll()` which loops through all 20 ticks and settles any that have orders
>
> On Monad, those order placements to different ticks can be executed in parallel by the network. The settlement also benefits - each tick's settlement logic is independent.

*When it completes:*

> Done. 12 transactions confirmed in about 30 seconds. You can see the full transaction log here - every hash links to the Monad explorer.

*Point to the heatmap and order feed updating.*

> The dashboard polls the chain every 2 seconds and updates live. The heatmap shows liquidity across all 20 ticks, and the order feed shows every order that was placed.

---

## PART 4: WHY THIS MATTERS - THE COMPARISON (1.5 minutes)

*Click the "Compare" tab.*

> Here's the punchline. We ran the same load test two ways.
>
> **FlashGrid (state-sharded):** 200 orders from 200 different wallets, each targeting a random tick. Because each tick has isolated storage, Monad processes ~100 orders per block. All 200 orders fit in just 2 blocks.
>
> **Sequential baseline (ParallelBenchmark):** Same 200 orders, but every order writes to the same `globalCounter` variable. One storage slot. Every transaction conflicts with every other transaction. Monad has to serialize them. Result: ~20 orders per block, 10 blocks to process the same workload.
>
> That's a **5x throughput improvement** just from how we structure our storage. No protocol changes, no special opcodes, no L2 tricks. Just storage layout design that respects the parallel execution model.

*Point to the bar chart.*

> The bar chart makes it visual:
> - Orders per block: 100 vs 20
> - Blocks needed: 2 vs 10  
> - Average latency: 420ms vs 1800ms
>
> Same chain, same transaction type, same number of users. The only difference is whether the contract design creates storage conflicts or avoids them.

---

## PART 5: TECHNICAL DEPTH (1 minute)

> Let me explain why this generalizes beyond our demo.
>
> **Any protocol on Monad can benefit from this pattern.** The question is: do your concurrent transactions touch the same storage slots?
>
> - **DEXs:** Instead of one pool with `reserve0`/`reserve1`, use a CLOB with isolated price ticks. That's what FlashGrid does.
> - **NFT mints:** Instead of one counter for tokenId, use sharded counters per batch.  
> - **Gaming:** Instead of one global state, shard by region or player group.
>
> The FlashGrid contract is only 261 lines of Solidity. The core insight fits in one sentence: **map your data to separate storage slots so concurrent writes don't conflict.**
>
> Here's the actual storage layout in the contract:

```solidity
mapping(uint8 => TickState) public ticks;      // Each tick = separate slot
mapping(uint8 => Order[]) public tickOrders;    // Each tick's orders = separate array
mapping(address => uint256) public balances;    // Only touched on deposit/withdraw
```

> Three mappings. That's all it takes to unlock parallel execution on Monad.

---

## CLOSING (30 seconds)

> To summarize:
>
> **Problem:** Traditional DeFi contracts create storage conflicts that force serial execution, even on parallel chains.
>
> **Solution:** State-sharded order books where each price tick has isolated storage slots. Zero conflicts, full parallelism.
>
> **Result:** 5x throughput improvement on Monad testnet, measured with 200 concurrent users.
>
> **What we built:**
> - FlashGrid smart contract (261 lines, 27 Foundry tests passing)
> - 28 end-to-end tests passing on Monad testnet
> - Interactive dashboard with live chain data, wallet integration, and one-click demo
> - Full benchmark comparison proving the speedup
>
> Everything is deployed and running on Monad testnet right now. The code is open source. Thank you.

---

## QUICK REFERENCE - Contract Addresses (Monad Testnet)

| Contract | Address |
|----------|---------|
| FlashGridFactory | `0x51Bacb5Dd1E9D6674853A038B87609aA702aF8b7` |
| FlashGrid Market | `0x89014cDeB2FDc07A0D99aD95FabC853620620666` |
| ParallelBenchmark | `0xF176D8C0a1179063F5e6Af5f45e53391f42f0DAC` |

**Explorer:** https://testnet.monadvision.com

---

## FAQ / JUDGE QUESTIONS

**Q: How do you know it's actually running in parallel?**
A: We measure orders-per-block. If 200 transactions from 200 wallets all targeting different ticks fit in 2 blocks, and the same 200 transactions targeting one slot need 10 blocks, the parallel execution engine is clearly batching the non-conflicting ones. We can't observe the internal scheduler directly, but the throughput difference is the proof.

**Q: What's the market question?**
A: "Will MON reach $10 by Q2 2025?" It's a prediction market. YES means you think it will, NO means you think it won't. The price tick represents the probability. $0.50 means 50/50 odds.

**Q: How does settlement work?**
A: Each tick settles independently. If tick 5 has 0.1 MON in YES and 0.05 MON in NO, the 0.05 MON is "matched" - YES winners get paid proportionally, and the remaining 0.05 MON unmatched YES liquidity is refunded. Settlement is pro-rata, not FIFO.

**Q: Could this work on mainnet?**
A: The contract is functional but simplified for the hackathon. Production would need: oracle integration for resolution, time-weighted settlement, fee structure, and an off-chain order relay for UX. The core storage-sharding pattern is production-ready.

**Q: Why not just use an L2?**
A: L2s solve throughput by moving execution off the main chain. FlashGrid solves throughput *within* the execution environment by eliminating storage conflicts. These approaches are complementary - you could run FlashGrid on an L2 too.

**Q: How is this different from a regular order book?**
A: Regular CLOBs on EVM still use shared state for the matching engine (sorted trees, linked lists). FlashGrid discretizes into fixed ticks with completely isolated storage per tick. It trades price granularity (20 ticks vs continuous) for parallel execution. For a prediction market where you only need ~20 price levels, that's a perfect tradeoff.
