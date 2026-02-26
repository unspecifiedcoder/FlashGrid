import { type Abi } from "viem";

// ═══════════════════════════════════════════════════════════
//                   NETWORK CONFIG
// ═══════════════════════════════════════════════════════════

export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
} as const;

// ═══════════════════════════════════════════════════════════
//                  CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════

// These should be updated after deployment
export const ADDRESSES = {
  factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
  flashGrid: process.env.NEXT_PUBLIC_FLASHGRID_ADDRESS || "0x0000000000000000000000000000000000000000",
  benchmark: process.env.NEXT_PUBLIC_BENCHMARK_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

// ═══════════════════════════════════════════════════════════
//                       ABIs
// ═══════════════════════════════════════════════════════════

export const FLASHGRID_ABI = [
  // Read functions
  {
    type: "function",
    name: "NUM_TICKS",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentEpoch",
    inputs: [],
    outputs: [{ type: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketQuestion",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balances",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTickState",
    inputs: [{ type: "uint8", name: "tick" }],
    outputs: [
      { type: "uint128", name: "yesLiquidity" },
      { type: "uint128", name: "noLiquidity" },
      { type: "uint32", name: "orderCount" },
      { type: "uint32", name: "lastMatchedEpoch" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllTickStates",
    inputs: [],
    outputs: [
      {
        type: "tuple[20]",
        components: [
          { type: "uint128", name: "totalYesLiquidity" },
          { type: "uint128", name: "totalNoLiquidity" },
          { type: "uint32", name: "orderCount" },
          { type: "uint32", name: "lastMatchedEpoch" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTickOrders",
    inputs: [{ type: "uint8", name: "tick" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "maker" },
          { type: "uint128", name: "amount" },
          { type: "bool", name: "isYes" },
          { type: "uint32", name: "epoch" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTickOrderCount",
    inputs: [{ type: "uint8", name: "tick" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ type: "uint256", name: "amount" }],
    outputs: [],
    stateMutability: "nonpayable",
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
  {
    type: "function",
    name: "settleTick",
    inputs: [{ type: "uint8", name: "tick" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settleAll",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { type: "address", name: "user", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { type: "address", name: "user", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
    ],
  },
  {
    type: "event",
    name: "OrderPlaced",
    inputs: [
      { type: "uint8", name: "tick", indexed: true },
      { type: "address", name: "maker", indexed: true },
      { type: "uint128", name: "amount", indexed: false },
      { type: "bool", name: "isYes", indexed: false },
      { type: "uint32", name: "epoch", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TickSettled",
    inputs: [
      { type: "uint8", name: "tick", indexed: true },
      { type: "uint32", name: "epoch", indexed: false },
      { type: "uint128", name: "yesMatched", indexed: false },
      { type: "uint128", name: "noMatched", indexed: false },
      { type: "uint256", name: "clearingPrice", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EpochCompleted",
    inputs: [
      { type: "uint32", name: "epoch", indexed: false },
      { type: "uint256", name: "totalVolume", indexed: false },
      { type: "uint16", name: "ticksActive", indexed: false },
    ],
  },
] as const satisfies Abi;

export const BENCHMARK_ABI = [
  {
    type: "function",
    name: "placeOrder",
    inputs: [{ type: "uint256", name: "amount" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "globalCounter",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOrderCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "OrderPlaced",
    inputs: [
      { type: "uint256", name: "orderId", indexed: true },
      { type: "address", name: "maker", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
    ],
  },
] as const satisfies Abi;

export const FACTORY_ABI = [
  {
    type: "function",
    name: "createMarket",
    inputs: [{ type: "string", name: "question" }],
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMarketCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllMarkets",
    inputs: [],
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { type: "address", name: "market", indexed: true },
      { type: "string", name: "question", indexed: false },
      { type: "address", name: "creator", indexed: true },
      { type: "uint256", name: "index", indexed: false },
    ],
  },
] as const satisfies Abi;
