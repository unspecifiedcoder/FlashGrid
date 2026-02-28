import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MONAD_TESTNET, ADDRESSES, FLASHGRID_ABI } from "@/lib/contract";

// ═══════════════════════════════════════════════════════════
//  DEMO MODE API - Runs a full demo sequence server-side
//  using the deployer key. No MetaMask required.
// ═══════════════════════════════════════════════════════════

const DELAY_MS = 350; // stagger to avoid rate limits

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const chain = {
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  nativeCurrency: MONAD_TESTNET.nativeCurrency,
  rpcUrls: MONAD_TESTNET.rpcUrls,
} as const;

export async function POST(request: Request) {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return NextResponse.json(
      { error: "Demo mode not configured (missing deployer key)" },
      { status: 500 }
    );
  }

  const flashGridAddress = ADDRESSES.flashGrid as `0x${string}`;
  if (flashGridAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(
      { error: "Contract not deployed" },
      { status: 500 }
    );
  }

  let body: { mode?: string } = {};
  try {
    body = await request.json();
  } catch {
    // default mode
  }

  const mode = body.mode || "quick"; // "quick" | "full"

  try {
    const account = privateKeyToAccount(pk as `0x${string}`);

    const publicClient = createPublicClient({
      chain,
      transport: http(MONAD_TESTNET.rpcUrls.default.http[0]),
    });

    const walletClient = createWalletClient({
      chain,
      transport: http(MONAD_TESTNET.rpcUrls.default.http[0]),
      account,
    });

    const results: Array<{ step: string; hash: string; status: string }> = [];

    // Helper: send tx and wait
    async function sendAndWait(
      step: string,
      fn: () => Promise<Hash>
    ): Promise<Hash> {
      const hash = await fn();
      await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });
      results.push({ step, hash, status: "confirmed" });
      await sleep(DELAY_MS);
      return hash;
    }

    // ─── Step 1: Deposit ─────────────────────────────
    const depositAmount = mode === "full" ? "0.5" : "0.2";
    await sendAndWait(`Deposit ${depositAmount} MON`, () =>
      walletClient.writeContract({
        address: flashGridAddress,
        abi: FLASHGRID_ABI,
        functionName: "deposit",
        value: parseEther(depositAmount),
      })
    );

    // ─── Step 2: Place orders across ticks ───────────
    const ticksToUse =
      mode === "full"
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        : [0, 2, 4, 6, 9];

    const orderAmount = mode === "full" ? "0.01" : "0.01";

    for (const tick of ticksToUse) {
      // Place YES order
      await sendAndWait(`YES order at tick ${tick}`, () =>
        walletClient.writeContract({
          address: flashGridAddress,
          abi: FLASHGRID_ABI,
          functionName: "placeOrder",
          args: [tick, parseEther(orderAmount), true],
        })
      );

      // Place NO order at same tick (to create matchable liquidity)
      await sendAndWait(`NO order at tick ${tick}`, () =>
        walletClient.writeContract({
          address: flashGridAddress,
          abi: FLASHGRID_ABI,
          functionName: "placeOrder",
          args: [tick, parseEther(orderAmount), false],
        })
      );
    }

    // ─── Step 3: Settle all ticks ────────────────────
    await sendAndWait("Settle all ticks", () =>
      walletClient.writeContract({
        address: flashGridAddress,
        abi: FLASHGRID_ABI,
        functionName: "settleAll",
      })
    );

    // ─── Step 4: Read final state ────────────────────
    const [epoch, tickStatesRaw] = await Promise.all([
      publicClient.readContract({
        address: flashGridAddress,
        abi: FLASHGRID_ABI,
        functionName: "currentEpoch",
      }),
      publicClient.readContract({
        address: flashGridAddress,
        abi: FLASHGRID_ABI,
        functionName: "getAllTickStates",
      }),
    ]);

    return NextResponse.json({
      success: true,
      mode,
      steps: results,
      totalTransactions: results.length,
      finalEpoch: Number(epoch),
      ticksWithOrders: ticksToUse.length,
    });
  } catch (error: any) {
    console.error("Demo error:", error);
    return NextResponse.json(
      {
        error: error.shortMessage || error.message || "Demo failed",
        details: error.details,
      },
      { status: 500 }
    );
  }
}
