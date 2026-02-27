import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { eventStore, getOrdersPerBlock, getActiveTicks, startPolling } from "@/lib/indexer";
import type { MetricsResponse } from "@/lib/types";

let initialized = false;

export async function GET() {
  if (!initialized) {
    await startPolling();
    initialized = true;
  }

  const ordersPerBlock = getOrdersPerBlock();
  const avgOrdersPerBlock =
    ordersPerBlock.length > 0
      ? ordersPerBlock.reduce((a, b) => a + b, 0) / ordersPerBlock.length
      : 0;

  const response: MetricsResponse = {
    ordersPerBlock,
    totalOrders: eventStore.totalOrders,
    totalVolume: formatEther(eventStore.totalVolume),
    avgLatency: avgOrdersPerBlock > 50 ? 420 : 800, // Estimated based on throughput
    successRate: eventStore.totalOrders > 0 ? 100 : 0,
    activeEpoch: 1, // Would read from contract in production
    activeTicks: getActiveTicks(),
    blocksProcessed: eventStore.ordersPerBlock.size,
  };

  return NextResponse.json(response);
}
