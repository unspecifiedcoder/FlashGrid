/**
 * FlashGrid - Comparison Script
 *
 * Runs both the state-sharded (FlashGrid) and sequential (ParallelBenchmark) tests
 * back-to-back, then prints a formatted comparison table.
 *
 * This script produces the "money shot" numbers for the demo.
 */

import { runFlashGridTest, runBenchmarkTest, printResults } from "./load-test.js";

async function main() {
  console.log();
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║      FlashGrid Parallelism Comparison Test           ║");
  console.log("║                                                      ║");
  console.log("║  Test 1: State-Sharded (FlashGrid)                   ║");
  console.log("║    → Orders at random ticks = isolated storage        ║");
  console.log("║    → Monad executes in parallel                       ║");
  console.log("║                                                      ║");
  console.log("║  Test 2: Single-Slot Baseline (ParallelBenchmark)    ║");
  console.log("║    → All orders touch same globalCounter              ║");
  console.log("║    → Forces serial re-execution                       ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();

  console.log("━━━ TEST 1: State-Sharded (FlashGrid) ━━━");
  const shardedResult = await runFlashGridTest();

  console.log();
  console.log("━━━ TEST 2: Sequential Baseline ━━━");
  const sequentialResult = await runBenchmarkTest();

  // Print comparison
  console.log();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("                    FINAL RESULTS                       ");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  printResults(shardedResult, sequentialResult);

  // Save results to JSON for the dashboard
  const results = {
    timestamp: new Date().toISOString(),
    sharded: {
      ordersSubmitted: shardedResult.ordersSubmitted,
      blocksUsed: shardedResult.blocksUsed,
      ordersPerBlock: shardedResult.ordersPerBlock,
      successRate: shardedResult.successRate,
      avgLatency: shardedResult.avgLatency,
    },
    sequential: {
      ordersSubmitted: sequentialResult.ordersSubmitted,
      blocksUsed: sequentialResult.blocksUsed,
      ordersPerBlock: sequentialResult.ordersPerBlock,
      successRate: sequentialResult.successRate,
      avgLatency: sequentialResult.avgLatency,
    },
    speedup:
      sequentialResult.ordersPerBlock > 0
        ? shardedResult.ordersPerBlock / sequentialResult.ordersPerBlock
        : 0,
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "../dashboard/public/benchmark-results.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\nResults saved to dashboard/public/benchmark-results.json");
}

main().catch(console.error);
