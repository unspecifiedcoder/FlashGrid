// route.ts (api/events)
// GET endpoint that returns recent OrderPlaced events from the in-memory
// event store. Accepts an optional ?limit query parameter.

import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { eventStore, startPolling } from "@/lib/indexer";

// Start polling when the API is first hit
let initialized = false;

export async function GET(request: Request) {
  if (!initialized) {
    await startPolling();
    initialized = true;
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Serialize settlements — convert BigInt fields to strings
  const settlements = eventStore.settlements.slice(-limit).reverse().map((s) => ({
    tick: s.tick,
    epoch: s.epoch,
    yesMatched: formatEther(s.yesMatched),
    noMatched: formatEther(s.noMatched),
    clearingPrice: s.clearingPrice.toString(),
    blockNumber: Number(s.blockNumber),
    transactionHash: s.transactionHash,
    timestamp: s.timestamp,
  }));

  const response = {
    orders: eventStore.orders.slice(-limit).reverse(),
    settlements,
    total: eventStore.totalOrders,
  };

  return NextResponse.json(response);
}
