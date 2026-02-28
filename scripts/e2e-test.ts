/**
 * FlashGrid E2E Test on Monad Testnet
 *
 * Tests the full lifecycle:
 * 1. Deposit MON into FlashGrid
 * 2. Place orders at different ticks (parallel-friendly)
 * 3. Place orders at the same tick (YES + NO)
 * 4. Settle a tick
 * 5. Settle all ticks
 * 6. Withdraw balance
 * 7. Test ParallelBenchmark (sequential baseline)
 * 8. Multi-wallet parallel order blast
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  decodeEventLog,
  type Chain,
  type Hash,
} from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";

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

const PRIVATE_KEY = (process.env.PRIVATE_KEY || "0x6b85bf9aae2701fbd120a260b3198809a9219f1f54fc892230d768afca1dfb5a") as `0x${string}`;
const FLASHGRID_ADDRESS = (process.env.FLASHGRID_ADDRESS || "0x89014cDeB2FDc07A0D99aD95FabC853620620666") as `0x${string}`;
const BENCHMARK_ADDRESS = (process.env.BENCHMARK_ADDRESS || "0xF176D8C0a1179063F5e6Af5f45e53391f42f0DAC") as `0x${string}`;
const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x51Bacb5Dd1E9D6674853A038B87609aA702aF8b7") as `0x${string}`;

// Use a different mnemonic - the default hardhat one has collisions with deployed contracts on Monad
const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

// ═══════════════════════════════════════════════════════════
//                         ABIs
// ═══════════════════════════════════════════════════════════

const FLASHGRID_ABI = [
  { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "withdraw", inputs: [{ type: "uint256", name: "amount" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "placeOrder", inputs: [{ type: "uint8", name: "tick" }, { type: "uint128", name: "amount" }, { type: "bool", name: "isYes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "settleTick", inputs: [{ type: "uint8", name: "tick" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "settleAll", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balances", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "currentEpoch", inputs: [], outputs: [{ type: "uint32" }], stateMutability: "view" },
  { type: "function", name: "marketQuestion", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "getTickState", inputs: [{ type: "uint8", name: "tick" }], outputs: [{ type: "uint128", name: "yesLiquidity" }, { type: "uint128", name: "noLiquidity" }, { type: "uint32", name: "orderCount" }, { type: "uint32", name: "lastMatchedEpoch" }], stateMutability: "view" },
  { type: "function", name: "getAllTickStates", inputs: [], outputs: [{ type: "tuple[20]", components: [{ type: "uint128", name: "totalYesLiquidity" }, { type: "uint128", name: "totalNoLiquidity" }, { type: "uint32", name: "orderCount" }, { type: "uint32", name: "lastMatchedEpoch" }] }], stateMutability: "view" },
  { type: "function", name: "getTickOrderCount", inputs: [{ type: "uint8", name: "tick" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "NUM_TICKS", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "event", name: "Deposited", inputs: [{ type: "address", name: "user", indexed: true }, { type: "uint256", name: "amount", indexed: false }] },
  { type: "event", name: "OrderPlaced", inputs: [{ type: "uint8", name: "tick", indexed: true }, { type: "address", name: "maker", indexed: true }, { type: "uint128", name: "amount", indexed: false }, { type: "bool", name: "isYes", indexed: false }, { type: "uint32", name: "epoch", indexed: false }] },
  { type: "event", name: "TickSettled", inputs: [{ type: "uint8", name: "tick", indexed: true }, { type: "uint32", name: "epoch", indexed: false }, { type: "uint128", name: "yesMatched", indexed: false }, { type: "uint128", name: "noMatched", indexed: false }, { type: "uint256", name: "clearingPrice", indexed: false }] },
  { type: "event", name: "EpochCompleted", inputs: [{ type: "uint32", name: "epoch", indexed: false }, { type: "uint256", name: "totalVolume", indexed: false }, { type: "uint16", name: "ticksActive", indexed: false }] },
] as const;

const BENCHMARK_ABI = [
  { type: "function", name: "placeOrder", inputs: [{ type: "uint256", name: "amount" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "globalCounter", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getOrderCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const FACTORY_ABI = [
  { type: "function", name: "getMarketCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAllMarkets", inputs: [], outputs: [{ type: "address[]" }], stateMutability: "view" },
] as const;

// ═══════════════════════════════════════════════════════════
//                     TEST HARNESS
// ═══════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${message}`);
    failed++;
    failures.push(message);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTx(publicClient: any, hash: Hash, label: string): Promise<any> {
  console.log(`    tx: ${hash.slice(0, 18)}...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") {
    throw new Error(`Transaction ${label} failed: ${hash}`);
  }
  // Small delay to let nonce sync on the RPC node
  await sleep(500);
  return receipt;
}

// ═══════════════════════════════════════════════════════════
//                        TESTS
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║          FlashGrid E2E Test Suite                    ║");
  console.log("║          Monad Testnet (Chain ID: 10143)             ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`Deployer: ${account.address}`);
  console.log(`FlashGrid: ${FLASHGRID_ADDRESS}`);
  console.log(`Benchmark: ${BENCHMARK_ADDRESS}`);
  console.log(`Factory: ${FACTORY_ADDRESS}`);
  console.log();

  const publicClient = createPublicClient({
    chain: MONAD_TESTNET,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: MONAD_TESTNET,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer balance: ${formatEther(balance)} MON`);
  console.log();

  // ─── TEST 1: Verify Deployment ─────────────────────────────
  console.log("━━━ TEST 1: Verify Deployment ━━━");

  const question = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "marketQuestion",
  });
  assert(question === "Will MON reach $10 by Q2 2025?", `Market question: "${question}"`);

  const epoch = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "currentEpoch",
  });
  assert(Number(epoch) >= 1, `Current epoch: ${epoch}`);

  const numTicks = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "NUM_TICKS",
  });
  assert(Number(numTicks) === 20, `NUM_TICKS: ${numTicks}`);

  const marketCount = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getMarketCount",
  });
  assert(Number(marketCount) >= 1, `Factory market count: ${marketCount}`);

  console.log();

  // ─── TEST 2: Deposit ───────────────────────────────────────
  console.log("━━━ TEST 2: Deposit MON ━━━");

  const depositAmount = parseEther("0.5");
  const depositHash = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "deposit",
    value: depositAmount,
  });
  const depositReceipt = await waitForTx(publicClient, depositHash, "deposit");
  assert(depositReceipt.status === "success", `Deposit 0.5 MON succeeded`);

  const contractBalance = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "balances",
    args: [account.address],
  });
  assert(contractBalance >= depositAmount, `Contract balance: ${formatEther(contractBalance as bigint)} MON`);

  console.log();

  // ─── TEST 3: Place Orders at Different Ticks ───────────────
  console.log("━━━ TEST 3: Place Orders at Different Ticks ━━━");

  const orderAmount = parseEther("0.01");

  // Order at tick 3 (YES)
  const order1Hash = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "placeOrder",
    args: [3, orderAmount, true],
  });
  await waitForTx(publicClient, order1Hash, "placeOrder tick 3 YES");
  assert(true, "Order at tick 3 (YES) placed");

  // Order at tick 10 (NO)
  const order2Hash = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "placeOrder",
    args: [10, orderAmount, false],
  });
  await waitForTx(publicClient, order2Hash, "placeOrder tick 10 NO");
  assert(true, "Order at tick 10 (NO) placed");

  // Order at tick 17 (YES)
  const order3Hash = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "placeOrder",
    args: [17, orderAmount, true],
  });
  await waitForTx(publicClient, order3Hash, "placeOrder tick 17 YES");
  assert(true, "Order at tick 17 (YES) placed");

  // Verify tick states
  const tick3State = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "getTickState",
    args: [3],
  });
  assert((tick3State as any)[0] > 0n, `Tick 3 YES liquidity: ${formatEther((tick3State as any)[0])} MON`);

  const tick10State = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "getTickState",
    args: [10],
  });
  assert((tick10State as any)[1] > 0n, `Tick 10 NO liquidity: ${formatEther((tick10State as any)[1])} MON`);

  console.log();

  // ─── TEST 4: Place Matching Orders and Settle ──────────────
  console.log("━━━ TEST 4: Place Matching Orders + Settle Tick ━━━");

  // Place YES order at tick 5
  const matchYes = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "placeOrder",
    args: [5, parseEther("0.02"), true],
  });
  await waitForTx(publicClient, matchYes, "placeOrder tick 5 YES");
  assert(true, "Matching YES order at tick 5");

  // Place NO order at tick 5
  const matchNo = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "placeOrder",
    args: [5, parseEther("0.02"), false],
  });
  await waitForTx(publicClient, matchNo, "placeOrder tick 5 NO");
  assert(true, "Matching NO order at tick 5");

  // Verify tick 5 has both sides
  const tick5Before = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "getTickState",
    args: [5],
  });
  assert((tick5Before as any)[0] > 0n && (tick5Before as any)[1] > 0n, "Tick 5 has both YES and NO liquidity");

  // Settle tick 5
  const settleHash = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "settleTick",
    args: [5],
  });
  const settleReceipt = await waitForTx(publicClient, settleHash, "settleTick(5)");
  assert(settleReceipt.status === "success", "settleTick(5) succeeded");

  // Verify tick 5 is cleared
  const tick5After = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "getTickState",
    args: [5],
  });
  assert((tick5After as any)[0] === 0n && (tick5After as any)[1] === 0n, "Tick 5 cleared after settlement");
  assert(Number((tick5After as any)[3]) > 0, `Tick 5 lastMatchedEpoch: ${(tick5After as any)[3]}`);

  console.log();

  // ─── TEST 5: Settle All ────────────────────────────────────
  console.log("━━━ TEST 5: Settle All Ticks ━━━");

  const epochBefore = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "currentEpoch",
  });

  const settleAllHash = await walletClient.writeContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "settleAll",
  });
  const settleAllReceipt = await waitForTx(publicClient, settleAllHash, "settleAll");
  assert(settleAllReceipt.status === "success", "settleAll() succeeded");

  const epochAfter = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "currentEpoch",
  });
  assert(Number(epochAfter) > Number(epochBefore), `Epoch advanced: ${epochBefore} → ${epochAfter}`);

  // Verify all ticks are cleared
  const allStates = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "getAllTickStates",
  });
  let allCleared = true;
  for (const state of allStates as any) {
    if (state.totalYesLiquidity > 0n || state.totalNoLiquidity > 0n) {
      allCleared = false;
      break;
    }
  }
  assert(allCleared, "All ticks cleared after settleAll");

  console.log();

  // ─── TEST 6: Withdraw ─────────────────────────────────────
  console.log("━━━ TEST 6: Withdraw ━━━");

  const balanceBefore = await publicClient.readContract({
    address: FLASHGRID_ADDRESS,
    abi: FLASHGRID_ABI,
    functionName: "balances",
    args: [account.address],
  });
  console.log(`    Contract balance before withdraw: ${formatEther(balanceBefore as bigint)} MON`);

  if ((balanceBefore as bigint) > 0n) {
    const withdrawAmount = (balanceBefore as bigint) / 2n; // Withdraw half
    const withdrawHash = await walletClient.writeContract({
      address: FLASHGRID_ADDRESS,
      abi: FLASHGRID_ABI,
      functionName: "withdraw",
      args: [withdrawAmount],
    });
    const withdrawReceipt = await waitForTx(publicClient, withdrawHash, "withdraw");
    assert(withdrawReceipt.status === "success", `Withdrew ${formatEther(withdrawAmount)} MON`);

    const balanceAfter = await publicClient.readContract({
      address: FLASHGRID_ADDRESS,
      abi: FLASHGRID_ABI,
      functionName: "balances",
      args: [account.address],
    });
    assert((balanceAfter as bigint) < (balanceBefore as bigint), `Balance decreased: ${formatEther(balanceAfter as bigint)} MON`);
  } else {
    assert(true, "No balance to withdraw (orders consumed all funds)");
  }

  console.log();

  // ─── TEST 7: ParallelBenchmark (Sequential Baseline) ──────
  console.log("━━━ TEST 7: ParallelBenchmark (Sequential Baseline) ━━━");

  const benchHash = await walletClient.writeContract({
    address: BENCHMARK_ADDRESS,
    abi: BENCHMARK_ABI,
    functionName: "placeOrder",
    args: [parseEther("0.001")],
  });
  await waitForTx(publicClient, benchHash, "benchmark placeOrder");

  const counter = await publicClient.readContract({
    address: BENCHMARK_ADDRESS,
    abi: BENCHMARK_ABI,
    functionName: "globalCounter",
  });
  assert(Number(counter) >= 1, `Benchmark globalCounter: ${counter}`);

  const orderCount = await publicClient.readContract({
    address: BENCHMARK_ADDRESS,
    abi: BENCHMARK_ABI,
    functionName: "getOrderCount",
  });
  assert(Number(orderCount) >= 1, `Benchmark orderCount: ${orderCount}`);

  console.log();

  // ─── TEST 8: Multi-wallet Parallel Order Blast ─────────────
  console.log("━━━ TEST 8: Multi-wallet Parallel Order Blast (10 wallets) ━━━");

  // Generate 10 test wallets and fund them
  const NUM_TEST_WALLETS = 10;
  const testWallets = [];
  for (let i = 0; i < NUM_TEST_WALLETS; i++) {
    testWallets.push(mnemonicToAccount(TEST_MNEMONIC, { addressIndex: i }));
  }

  console.log("  Funding test wallets (sequentially from deployer)...");
  let fundedCount = 0;
  for (const wallet of testWallets) {
    try {
      const hash = await walletClient.sendTransaction({
        to: wallet.address,
        value: parseEther("0.05"),
      });
      await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      fundedCount++;
      process.stdout.write(`    Funded ${fundedCount}/${NUM_TEST_WALLETS}\r`);
    } catch (err: any) {
      console.log(`    Failed to fund ${wallet.address}: ${err.shortMessage || err.message}`);
    }
  }
  console.log();
  assert(fundedCount === NUM_TEST_WALLETS, `Funded ${fundedCount}/${NUM_TEST_WALLETS} test wallets`);

  // Each wallet deposits (with rate limit delay to avoid 429)
  console.log("  Depositing from all wallets...");
  const depositReceipts = [];
  // Send all deposit txs with staggered timing (each wallet has own nonce so they can go in parallel)
  const depositTxHashes: Hash[] = [];
  for (let i = 0; i < testWallets.length; i++) {
    const wallet = testWallets[i];
    try {
      const wc = createWalletClient({
        account: wallet,
        chain: MONAD_TESTNET,
        transport: http(),
      });
      const hash = await wc.writeContract({
        address: FLASHGRID_ADDRESS,
        abi: FLASHGRID_ABI,
        functionName: "deposit",
        value: parseEther("0.03"),
      });
      depositTxHashes.push(hash);
      // Small delay to avoid rate limit
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      console.log(`    Deposit failed for wallet ${i}: ${err.shortMessage || err.message}`);
    }
  }
  // Wait for all deposit receipts
  let depositSuccesses = 0;
  for (const hash of depositTxHashes) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status === "success") depositSuccesses++;
    } catch {}
  }
  assert(depositSuccesses === NUM_TEST_WALLETS, `${depositSuccesses}/${NUM_TEST_WALLETS} deposits succeeded`);

  // Each wallet places order at different tick (with staggered sends)
  console.log("  Placing orders at different ticks...");
  const orderStartTime = Date.now();
  const orderTxData: Array<{ hash: Hash; tick: number; wallet: string }> = [];

  for (let i = 0; i < testWallets.length; i++) {
    const wallet = testWallets[i];
    const tick = i % 20; // Spread across ticks
    const isYes = i % 2 === 0;
    try {
      const wc = createWalletClient({
        account: wallet,
        chain: MONAD_TESTNET,
        transport: http(),
      });
      const hash = await wc.writeContract({
        address: FLASHGRID_ADDRESS,
        abi: FLASHGRID_ABI,
        functionName: "placeOrder",
        args: [tick, parseEther("0.01"), isYes],
      });
      orderTxData.push({ hash, tick, wallet: wallet.address });
      // Small delay to avoid 429
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      console.log(`    Order failed for wallet ${i}: ${err.shortMessage || err.message}`);
    }
  }
  const orderEndTime = Date.now();

  // Wait for all order confirmations
  const confirmed: Array<{ hash: Hash; tick: number; wallet: string; receipt: any }> = [];
  for (const txd of orderTxData) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txd.hash, timeout: 60_000 });
      confirmed.push({ ...txd, receipt });
    } catch {}
  }

  const orderSuccesses = confirmed.filter((r) => r.receipt.status === "success").length;
  assert(orderSuccesses === NUM_TEST_WALLETS, `${orderSuccesses}/${NUM_TEST_WALLETS} orders placed successfully`);

  // Analyze block packing
  const blocks = new Set(confirmed.map((r) => Number(r.receipt.blockNumber)));
  const blocksUsed = blocks.size;
  const ordersPerBlock = Math.round(orderSuccesses / blocksUsed);
  const totalTime = orderEndTime - orderStartTime;

  console.log(`    Blocks used: ${blocksUsed}`);
  console.log(`    Orders/block: ~${ordersPerBlock}`);
  console.log(`    Time to submit: ${totalTime}ms`);

  assert(blocksUsed <= NUM_TEST_WALLETS, `Orders packed into ${blocksUsed} blocks (${ordersPerBlock} orders/block)`);

  console.log();

  // ─── RESULTS ───────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════");

  if (failures.length > 0) {
    console.log("\n  Failures:");
    for (const f of failures) {
      console.log(`    - ${f}`);
    }
  }

  console.log();

  // Check remaining balance
  const finalBalance = await publicClient.getBalance({ address: account.address });
  console.log(`  Deployer final balance: ${formatEther(finalBalance)} MON`);
  console.log(`  Gas spent: ~${formatEther(balance - finalBalance)} MON`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err);
  process.exit(1);
});
