// indexer.ts
// Server-side event indexer that polls for FlashGrid contract events.
// Uses chain config from chains.ts for multi-chain support.

import { createPublicClient, http, formatEther } from "viem";
import { getChain, ADDRESSES, FLASHGRID_ABI } from "./contract";
import type { LiveOrder, TickSettledEvent } from "./types";

// ──────────────────────────────────────────────────────────────
//                  IN-MEMORY EVENT STORE
// ═══════════════════════════════════════════════════════════

const MAX_EVENTS = 1000;
const MAX_BLOCK_RANGE = 2000n;
const BACKFILL_BLOCKS = 10000n;

interface EventStore {
  orders: LiveOrder[];
  settlements: TickSettledEvent[];
  seenOrderIds: Set<string>;
  seenSettlementIds: Set<string>;
  ordersPerBlock: Map<number, number>;
  totalOrders: number;
  totalVolume: bigint;
  lastProcessedBlock: bigint;
}

export const eventStore: EventStore = {
  orders: [],
  settlements: [],
  seenOrderIds: new Set(),
  seenSettlementIds: new Set(),
  ordersPerBlock: new Map(),
  totalOrders: 0,
  totalVolume: 0n,
  lastProcessedBlock: 0n,
};

function pushOrder(order: LiveOrder) {
  if (eventStore.seenOrderIds.has(order.id)) return;
  eventStore.seenOrderIds.add(order.id);

  eventStore.orders.push(order);
  if (eventStore.orders.length > MAX_EVENTS) {
    const removed = eventStore.orders.shift();
    if (removed) eventStore.seenOrderIds.delete(removed.id);
  }
  eventStore.totalOrders++;

  const blockNum = order.blockNumber;
  const current = eventStore.ordersPerBlock.get(blockNum) || 0;
  eventStore.ordersPerBlock.set(blockNum, current + 1);
}

function pushSettlement(settlement: TickSettledEvent) {
  const id = `${settlement.transactionHash}-${settlement.tick}-${settlement.epoch}`;
  if (eventStore.seenSettlementIds.has(id)) return;
  eventStore.seenSettlementIds.add(id);

  eventStore.settlements.push(settlement);
  if (eventStore.settlements.length > MAX_EVENTS) {
    eventStore.settlements.shift();
  }
}

// ═══════════════════════════════════════════════════════════
//                   VIEM CLIENT
// ═══════════════════════════════════════════════════════════

let client: ReturnType<typeof createPublicClient> | null = null;

export function getClient() {
  if (!client) {
    const chain = getChain();
    client = createPublicClient({
      chain: {
        id: chain.id,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls,
      },
      transport: http(chain.rpcUrls.default.http[0]),
    });
  }
  return client;
}

const flashGridAddress = ADDRESSES.flashGrid as `0x${string}`;

const ORDER_PLACED_EVENT = {
  type: "event" as const,
  name: "OrderPlaced" as const,
  inputs: [
    { type: "uint8" as const, name: "tick" as const, indexed: true },
    { type: "address" as const, name: "maker" as const, indexed: true },
    { type: "uint128" as const, name: "amount" as const, indexed: false },
    { type: "bool" as const, name: "isYes" as const, indexed: false },
    { type: "uint32" as const, name: "epoch" as const, indexed: false },
  ],
};

const TICK_SETTLED_EVENT = {
  type: "event" as const,
  name: "TickSettled" as const,
  inputs: [
    { type: "uint8" as const, name: "tick" as const, indexed: true },
    { type: "uint32" as const, name: "epoch" as const, indexed: false },
    { type: "uint128" as const, name: "yesMatched" as const, indexed: false },
    { type: "uint128" as const, name: "noMatched" as const, indexed: false },
    { type: "uint256" as const, name: "clearingPrice" as const, indexed: false },
  ],
};

// ═══════════════════════════════════════════════════════════
//     FETCH EVENTS FOR A BLOCK RANGE (chunked)
// ═══════════════════════════════════════════════════════════

async function fetchEventsInRange(
  publicClient: ReturnType<typeof createPublicClient>,
  from: bigint,
  to: bigint
) {
  for (let start = from; start <= to; start += MAX_BLOCK_RANGE) {
    const end = start + MAX_BLOCK_RANGE - 1n > to ? to : start + MAX_BLOCK_RANGE - 1n;

    try {
      const orderLogs = await publicClient.getLogs({
        address: flashGridAddress,
        event: ORDER_PLACED_EVENT,
        fromBlock: start,
        toBlock: end,
      });

      for (let i = 0; i < orderLogs.length; i++) {
        const log = orderLogs[i];
        const args = log.args as {
          tick?: number;
          maker?: string;
          amount?: bigint;
          isYes?: boolean;
          epoch?: number;
        };
        if (!args.tick && args.tick !== 0) continue;

        const logIdx = log.logIndex != null ? log.logIndex : i;
        const order: LiveOrder = {
          id: `${log.transactionHash}-${logIdx}-${Number(log.blockNumber)}`,
          tick: Number(args.tick),
          side: args.isYes ? "YES" : "NO",
          amount: formatEther(args.amount || 0n),
          maker: args.maker || "0x",
          blockNumber: Number(log.blockNumber),
          timestamp: Date.now(),
        };
        pushOrder(order);
        eventStore.totalVolume += args.amount || 0n;
      }

      const settleLogs = await publicClient.getLogs({
        address: flashGridAddress,
        event: TICK_SETTLED_EVENT,
        fromBlock: start,
        toBlock: end,
      });

      for (const log of settleLogs) {
        const args = log.args as {
          tick?: number;
          epoch?: number;
          yesMatched?: bigint;
          noMatched?: bigint;
          clearingPrice?: bigint;
        };

        const settlement: TickSettledEvent = {
          tick: Number(args.tick || 0),
          epoch: Number(args.epoch || 0),
          yesMatched: args.yesMatched || 0n,
          noMatched: args.noMatched || 0n,
          clearingPrice: args.clearingPrice || 0n,
          blockNumber: log.blockNumber || 0n,
          transactionHash: log.transactionHash || "0x",
          timestamp: Date.now(),
        };
        pushSettlement(settlement);
      }
    } catch (err) {
      console.error(`Failed to fetch events for blocks ${start}-${end}:`, err);
    }
  }
}

// ═══════════════════════════════════════════════════════════
//                   EVENT POLLING
// ═══════════════════════════════════════════════════════════

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let backfillDone = false;

export async function startPolling(intervalMs = 2000) {
  if (pollingInterval) return;

  if (flashGridAddress === "0x0000000000000000000000000000000000000000") {
    console.log("FlashGrid address not configured, skipping polling");
    return;
  }

  const publicClient = getClient();

  let currentBlock: bigint;
  try {
    currentBlock = await publicClient.getBlockNumber();
  } catch {
    console.error("Failed to get current block number");
    return;
  }

  eventStore.lastProcessedBlock = currentBlock;

  if (!backfillDone) {
    backfillDone = true;
    const backfillFrom = currentBlock > BACKFILL_BLOCKS ? currentBlock - BACKFILL_BLOCKS : 0n;
    fetchEventsInRange(publicClient, backfillFrom, currentBlock).catch((err) => {
      console.error("Backfill error:", err);
    });
  }

  pollingInterval = setInterval(async () => {
    try {
      const latestBlock = await publicClient.getBlockNumber();
      if (latestBlock <= eventStore.lastProcessedBlock) return;

      await fetchEventsInRange(
        publicClient,
        eventStore.lastProcessedBlock + 1n,
        latestBlock
      );

      eventStore.lastProcessedBlock = latestBlock;
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, intervalMs);
}

export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// ═══════════════════════════════════════════════════════════
//                   METRICS HELPERS
// ═══════════════════════════════════════════════════════════

export function getOrdersPerBlock(): number[] {
  const entries = Array.from(eventStore.ordersPerBlock.entries())
    .sort(([a], [b]) => a - b)
    .slice(-50);

  return entries.map(([, count]) => count);
}

export function getActiveTicks(): number {
  const tickSet = new Set<number>();
  const recent = eventStore.orders.slice(-100);
  for (const order of recent) {
    tickSet.add(order.tick);
  }
  return tickSet.size;
}
