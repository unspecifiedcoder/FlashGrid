import { NextResponse } from "next/server";
import { createPublicClient, http, formatEther } from "viem";
import { MONAD_TESTNET, ADDRESSES, FLASHGRID_ABI } from "@/lib/contract";
import type { TicksResponse } from "@/lib/types";
import { NUM_TICKS, TICK_PRICES } from "@/lib/types";

export async function GET() {
  const flashGridAddress = ADDRESSES.flashGrid as `0x${string}`;

  // If contract not deployed, return mock data
  if (flashGridAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(getMockTickData());
  }

  try {
    const client = createPublicClient({
      chain: {
        id: MONAD_TESTNET.id,
        name: MONAD_TESTNET.name,
        nativeCurrency: MONAD_TESTNET.nativeCurrency,
        rpcUrls: MONAD_TESTNET.rpcUrls,
      },
      transport: http(MONAD_TESTNET.rpcUrls.default.http[0]),
    });

    const result = await client.readContract({
      address: flashGridAddress,
      abi: FLASHGRID_ABI,
      functionName: "getAllTickStates",
    });

    const epoch = await client.readContract({
      address: flashGridAddress,
      abi: FLASHGRID_ABI,
      functionName: "currentEpoch",
    });

    const states = result as unknown as Array<{
      totalYesLiquidity: bigint;
      totalNoLiquidity: bigint;
      orderCount: number;
      lastMatchedEpoch: number;
    }>;

    const ticks = Array.from(states).map((s, i) => ({
      index: i,
      price: TICK_PRICES[i],
      yesLiquidity: formatEther(s.totalYesLiquidity),
      noLiquidity: formatEther(s.totalNoLiquidity),
      orderCount: Number(s.orderCount),
      lastMatchedEpoch: Number(s.lastMatchedEpoch),
    }));

    const response: TicksResponse = {
      ticks,
      currentEpoch: Number(epoch),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching tick data:", error);
    return NextResponse.json(getMockTickData());
  }
}

function getMockTickData(): TicksResponse {
  return {
    ticks: Array.from({ length: NUM_TICKS }, (_, i) => ({
      index: i,
      price: TICK_PRICES[i],
      yesLiquidity: "0",
      noLiquidity: "0",
      orderCount: 0,
      lastMatchedEpoch: 0,
    })),
    currentEpoch: 1,
  };
}
