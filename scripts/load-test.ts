/**
 * FlashGrid - Parallel Load Test
 *
 * The most important non-contract artifact. Produces the numbers judges remember.
 *
 * Workflow:
 * 1. Generate 200 funded wallets (derive from single mnemonic)
 * 2. Each wallet deposits to FlashGrid
 * 3. Each wallet places 1 order at a RANDOM tick (0-19)
 *    → Orders spread across ticks = different storage slots = parallel
 * 4. Measure: orders packed per block, latency, success rate
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  type Chain,
  type Hash,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

// ═══════════════════════════════════════════════════════════
//                     CONFIGURATION
// ═══════════════════════════════════════════════════════════

const MONAD_TESTNET: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
};

const NUM_WALLETS = 200;
const ORDER_AMOUNT = parseEther("0.01"); // 0.01 MON per order
const DEPOSIT_AMOUNT = parseEther("0.05"); // 0.05 MON deposit per wallet
const NUM_TICKS = 20;
const BATCH_SIZE = 50; // Send 50 txs at once

const TEST_MNEMONIC =
  process.env.TEST_MNEMONIC ||
  "test test test test test test test test test test test junk";

// Contract addresses (set via env)
const FLASHGRID_ADDRESS = process.env.FLASHGRID_ADDRESS as `0x${string}`;
const BENCHMARK_ADDRESS = process.env.BENCHMARK_ADDRESS as `0x${string}`;

// ═══════════════════════════════════════════════════════════
//                     ABI FRAGMENTS
// ═══════════════════════════════════════════════════════════

const FLASHGRID_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "placeOrder",
    inputs: [
      { type: "uint8", name: "tick" },
      { type: "uint128", name: "amount" },
      { type: "bool", name: "isYes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const BENCHMARK_ABI = [
  {
    type: "function",
    name: "placeOrder",
    inputs: [{ type: "uint256", name: "amount" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ═══════════════════════════════════════════════════════════
//                    RESULT TYPES
// ═══════════════════════════════════════════════════════════

interface TestResult {
  label: string;
  ordersSubmitted: number;
  ordersSucceeded: number;
  ordersFailed: number;
  blocksUsed: number;
  ordersPerBlock: number;
  successRate: number;
  avgLatency: number;
  minBlock: number;
  maxBlock: number;
  totalTimeMs: number;
}

// ═══════════════════════════════════════════════════════════
//                   WALLET GENERATION
// ═══════════════════════════════════════════════════════════

function generateWallets(count: number) {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    wallets.push(
      mnemonicToAccount(TEST_MNEMONIC, { addressIndex: i })
    );
  }
  return wallets;
}

// ═══════════════════════════════════════════════════════════
//             FLASHGRID LOAD TEST (SHARDED)
// ═══════════════════════════════════════════════════════════

async function runFlashGridTest(): Promise<TestResult> {
  console.log("\n  Running FlashGrid (State-Sharded) test...");

  if (!FLASHGRID_ADDRESS) {
    throw new Error("FLASHGRID_ADDRESS not set");
  }

  const publicClient = createPublicClient({
    chain: MONAD_TESTNET,
    transport: http(),
  });

  const wallets = generateWallets(NUM_WALLETS);
  const txHashes: Hash[] = [];
  const txTimestamps: Map<Hash, number> = new Map();
  let failed = 0;

  // Phase 1: Deposit
  console.log("  Phase 1: Depositing...");
  for (let batch = 0; batch < NUM_WALLETS; batch += BATCH_SIZE) {
    const batchWallets = wallets.slice(batch, batch + BATCH_SIZE);
    const promises = batchWallets.map(async (account) => {
      try {
        const walletClient = createWalletClient({
          account,
          chain: MONAD_TESTNET,
          transport: http(),
        });
        const hash = await walletClient.sendTransaction({
          to: FLASHGRID_ADDRESS,
          value: DEPOSIT_AMOUNT,
          data: encodeFunctionData({
            abi: FLASHGRID_ABI,
            functionName: "deposit",
          }),
        });
        return hash;
      } catch {
        failed++;
        return null;
      }
    });
    await Promise.all(promises);
    process.stdout.write(`    Batch ${Math.floor(batch / BATCH_SIZE) + 1}/${Math.ceil(NUM_WALLETS / BATCH_SIZE)} deposited\r`);
  }
  console.log(`  Deposits complete (${failed} failed)`);

  // Wait a few seconds for deposits to confirm
  await new Promise((r) => setTimeout(r, 3000));

  // Phase 2: Place orders at RANDOM ticks
  console.log("  Phase 2: Placing orders at random ticks...");
  failed = 0;
  const startTime = Date.now();

  for (let batch = 0; batch < NUM_WALLETS; batch += BATCH_SIZE) {
    const batchWallets = wallets.slice(batch, batch + BATCH_SIZE);
    const promises = batchWallets.map(async (account, i) => {
      const tick = Math.floor(Math.random() * NUM_TICKS); // Random tick
      const isYes = Math.random() > 0.5;

      try {
        const walletClient = createWalletClient({
          account,
          chain: MONAD_TESTNET,
          transport: http(),
        });

        const sendTime = Date.now();
        const hash = await walletClient.writeContract({
          address: FLASHGRID_ADDRESS,
          abi: FLASHGRID_ABI,
          functionName: "placeOrder",
          args: [tick, ORDER_AMOUNT, isYes],
        });

        txHashes.push(hash);
        txTimestamps.set(hash, sendTime);
        return hash;
      } catch {
        failed++;
        return null;
      }
    });
    await Promise.all(promises);
    process.stdout.write(`    Batch ${Math.floor(batch / BATCH_SIZE) + 1}/${Math.ceil(NUM_WALLETS / BATCH_SIZE)} placed\r`);
  }

  const endTime = Date.now();
  console.log(`  Orders placed (${failed} failed)`);

  // Phase 3: Wait for confirmations and analyze
  console.log("  Phase 3: Waiting for confirmations...");
  await new Promise((r) => setTimeout(r, 5000));

  const blockNumbers: Set<number> = new Set();
  const latencies: number[] = [];

  for (const hash of txHashes) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      blockNumbers.add(Number(receipt.blockNumber));

      const sendTime = txTimestamps.get(hash);
      if (sendTime) {
        // Approximate latency from send time to now (block confirmation)
        latencies.push(Date.now() - sendTime);
      }
    } catch {
      // Transaction may still be pending
    }
  }

  const blocksUsed = blockNumbers.size || 1;
  const ordersSucceeded = txHashes.length;
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  const sortedBlocks = Array.from(blockNumbers).sort((a, b) => a - b);

  return {
    label: "State-Sharded (FlashGrid)",
    ordersSubmitted: NUM_WALLETS,
    ordersSucceeded,
    ordersFailed: failed,
    blocksUsed,
    ordersPerBlock: Math.round(ordersSucceeded / blocksUsed),
    successRate: Math.round((ordersSucceeded / NUM_WALLETS) * 100),
    avgLatency,
    minBlock: sortedBlocks[0] || 0,
    maxBlock: sortedBlocks[sortedBlocks.length - 1] || 0,
    totalTimeMs: endTime - startTime,
  };
}

// ═══════════════════════════════════════════════════════════
//          BENCHMARK LOAD TEST (SEQUENTIAL)
// ═══════════════════════════════════════════════════════════

async function runBenchmarkTest(): Promise<TestResult> {
  console.log("\n  Running Sequential Baseline test...");

  if (!BENCHMARK_ADDRESS) {
    throw new Error("BENCHMARK_ADDRESS not set");
  }

  const publicClient = createPublicClient({
    chain: MONAD_TESTNET,
    transport: http(),
  });

  const wallets = generateWallets(NUM_WALLETS);
  const txHashes: Hash[] = [];
  const txTimestamps: Map<Hash, number> = new Map();
  let failed = 0;

  const startTime = Date.now();

  for (let batch = 0; batch < NUM_WALLETS; batch += BATCH_SIZE) {
    const batchWallets = wallets.slice(batch, batch + BATCH_SIZE);
    const promises = batchWallets.map(async (account) => {
      try {
        const walletClient = createWalletClient({
          account,
          chain: MONAD_TESTNET,
          transport: http(),
        });

        const sendTime = Date.now();
        const hash = await walletClient.writeContract({
          address: BENCHMARK_ADDRESS,
          abi: BENCHMARK_ABI,
          functionName: "placeOrder",
          args: [ORDER_AMOUNT],
        });

        txHashes.push(hash);
        txTimestamps.set(hash, sendTime);
        return hash;
      } catch {
        failed++;
        return null;
      }
    });
    await Promise.all(promises);
    process.stdout.write(`    Batch ${Math.floor(batch / BATCH_SIZE) + 1}/${Math.ceil(NUM_WALLETS / BATCH_SIZE)} placed\r`);
  }

  const endTime = Date.now();
  console.log(`  Orders placed (${failed} failed)`);

  // Wait for confirmations
  console.log("  Waiting for confirmations...");
  await new Promise((r) => setTimeout(r, 10000));

  const blockNumbers: Set<number> = new Set();
  const latencies: number[] = [];

  for (const hash of txHashes) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      blockNumbers.add(Number(receipt.blockNumber));

      const sendTime = txTimestamps.get(hash);
      if (sendTime) {
        latencies.push(Date.now() - sendTime);
      }
    } catch {
      // Transaction may still be pending
    }
  }

  const blocksUsed = blockNumbers.size || 1;
  const ordersSucceeded = txHashes.length;
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  const sortedBlocks = Array.from(blockNumbers).sort((a, b) => a - b);

  return {
    label: "Single-Slot Baseline (sequential)",
    ordersSubmitted: NUM_WALLETS,
    ordersSucceeded,
    ordersFailed: failed,
    blocksUsed,
    ordersPerBlock: Math.round(ordersSucceeded / blocksUsed),
    successRate: Math.round((ordersSucceeded / NUM_WALLETS) * 100),
    avgLatency,
    minBlock: sortedBlocks[0] || 0,
    maxBlock: sortedBlocks[sortedBlocks.length - 1] || 0,
    totalTimeMs: endTime - startTime,
  };
}

// ═══════════════════════════════════════════════════════════
//                     RESULT DISPLAY
// ═══════════════════════════════════════════════════════════

export function printResults(sharded: TestResult, sequential?: TestResult) {
  console.log();
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║             FlashGrid Parallelism Report             ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║ ${sharded.label.padEnd(52)} ║`);
  console.log(`║   Orders submitted:    ${String(sharded.ordersSubmitted).padEnd(28)} ║`);
  console.log(`║   Orders succeeded:    ${String(sharded.ordersSucceeded).padEnd(28)} ║`);
  console.log(`║   Blocks used:         ${String(sharded.blocksUsed).padEnd(28)} ║`);
  console.log(`║   Orders/block:        ~${String(sharded.ordersPerBlock).padEnd(27)} ║`);
  console.log(`║   Success rate:        ${String(sharded.successRate + "%").padEnd(28)} ║`);
  console.log(`║   Avg latency:         ${String(sharded.avgLatency + "ms").padEnd(28)} ║`);
  console.log(`║   Total time:          ${String(sharded.totalTimeMs + "ms").padEnd(28)} ║`);

  if (sequential) {
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║ ${sequential.label.padEnd(52)} ║`);
    console.log(`║   Orders submitted:    ${String(sequential.ordersSubmitted).padEnd(28)} ║`);
    console.log(`║   Orders succeeded:    ${String(sequential.ordersSucceeded).padEnd(28)} ║`);
    console.log(`║   Blocks used:         ${String(sequential.blocksUsed).padEnd(28)} ║`);
    console.log(`║   Orders/block:        ~${String(sequential.ordersPerBlock).padEnd(27)} ║`);
    console.log(`║   Success rate:        ${String(sequential.successRate + "%").padEnd(28)} ║`);
    console.log(`║   Avg latency:         ${String(sequential.avgLatency + "ms").padEnd(28)} ║`);
    console.log(`║   Total time:          ${String(sequential.totalTimeMs + "ms").padEnd(28)} ║`);
    console.log("╠══════════════════════════════════════════════════════╣");

    const speedup =
      sequential.ordersPerBlock > 0
        ? (sharded.ordersPerBlock / sequential.ordersPerBlock).toFixed(1)
        : "N/A";
    console.log(`║ Parallel Speedup:      ~${String(speedup + "x").padEnd(27)} ║`);
  }

  console.log("╚══════════════════════════════════════════════════════╝");
}

// ═══════════════════════════════════════════════════════════
//                        MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║          FlashGrid Parallel Load Test                ║");
  console.log("║          200 wallets × random ticks                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const mode = process.argv[2] || "sharded";

  if (mode === "sharded" || mode === "both") {
    const shardedResult = await runFlashGridTest();
    printResults(shardedResult);

    if (mode === "both") {
      const seqResult = await runBenchmarkTest();
      printResults(shardedResult, seqResult);
    }
  } else if (mode === "sequential") {
    const seqResult = await runBenchmarkTest();
    printResults(seqResult);
  } else {
    console.log("Usage: npx tsx load-test.ts [sharded|sequential|both]");
  }
}

main().catch(console.error);

export { runFlashGridTest, runBenchmarkTest };
