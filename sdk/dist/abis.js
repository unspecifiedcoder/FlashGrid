// ABI definitions for FlashGrid smart contracts.
export const FLASHGRID_ABI = [
    { type: "function", name: "NUM_TICKS", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
    { type: "function", name: "MIN_ORDER_SIZE", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
    { type: "function", name: "currentEpoch", inputs: [], outputs: [{ type: "uint32" }], stateMutability: "view" },
    { type: "function", name: "marketQuestion", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
    { type: "function", name: "resolver", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { type: "function", name: "resolved", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
    { type: "function", name: "outcomeYes", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
    { type: "function", name: "paused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
    { type: "function", name: "balances", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    {
        type: "function", name: "getTickState", inputs: [{ type: "uint8", name: "tick" }],
        outputs: [
            { type: "uint128", name: "yesLiquidity" },
            { type: "uint128", name: "noLiquidity" },
            { type: "uint32", name: "orderCount" },
            { type: "uint32", name: "lastSettledEpoch" },
        ],
        stateMutability: "view",
    },
    {
        type: "function", name: "getAllTickStates", inputs: [],
        outputs: [{
                type: "tuple[20]",
                components: [
                    { type: "uint128", name: "totalYesLiquidity" },
                    { type: "uint128", name: "totalNoLiquidity" },
                    { type: "uint32", name: "orderCount" },
                    { type: "uint32", name: "lastSettledEpoch" },
                ],
            }],
        stateMutability: "view",
    },
    {
        type: "function", name: "getTickOrders", inputs: [{ type: "uint8", name: "tick" }],
        outputs: [{
                type: "tuple[]",
                components: [
                    { type: "address", name: "maker" },
                    { type: "uint128", name: "amount" },
                    { type: "bool", name: "isYes" },
                    { type: "uint32", name: "epoch" },
                    { type: "bool", name: "cancelled" },
                    { type: "bool", name: "claimed" },
                ],
            }],
        stateMutability: "view",
    },
    { type: "function", name: "getTickOrderCount", inputs: [{ type: "uint8", name: "tick" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
    { type: "function", name: "withdraw", inputs: [{ type: "uint256", name: "amount" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "placeOrder", inputs: [{ type: "uint8", name: "tick" }, { type: "uint128", name: "amount" }, { type: "bool", name: "isYes" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "cancelOrder", inputs: [{ type: "uint8", name: "tick" }, { type: "uint256", name: "orderIndex" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "resolveMarket", inputs: [{ type: "bool", name: "_outcomeYes" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "settleTick", inputs: [{ type: "uint8", name: "tick" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "settleAll", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
    // Events
    { type: "event", name: "Deposited", inputs: [{ type: "address", name: "user", indexed: true }, { type: "uint256", name: "amount", indexed: false }] },
    { type: "event", name: "Withdrawn", inputs: [{ type: "address", name: "user", indexed: true }, { type: "uint256", name: "amount", indexed: false }] },
    { type: "event", name: "OrderPlaced", inputs: [{ type: "uint8", name: "tick", indexed: true }, { type: "address", name: "maker", indexed: true }, { type: "uint128", name: "amount", indexed: false }, { type: "bool", name: "isYes", indexed: false }, { type: "uint32", name: "epoch", indexed: false }] },
    { type: "event", name: "OrderCancelled", inputs: [{ type: "uint8", name: "tick", indexed: true }, { type: "address", name: "maker", indexed: true }, { type: "uint256", name: "orderIndex", indexed: false }, { type: "uint128", name: "amount", indexed: false }] },
    { type: "event", name: "TickSettled", inputs: [{ type: "uint8", name: "tick", indexed: true }, { type: "uint32", name: "epoch", indexed: false }, { type: "uint128", name: "yesMatched", indexed: false }, { type: "uint128", name: "noMatched", indexed: false }, { type: "uint256", name: "clearingPrice", indexed: false }] },
    { type: "event", name: "EpochCompleted", inputs: [{ type: "uint32", name: "epoch", indexed: false }, { type: "uint256", name: "totalVolume", indexed: false }, { type: "uint16", name: "ticksActive", indexed: false }] },
    { type: "event", name: "MarketResolved", inputs: [{ type: "bool", name: "outcomeYes", indexed: false }, { type: "address", name: "resolvedBy", indexed: true }] },
    { type: "event", name: "PayoutClaimed", inputs: [{ type: "uint8", name: "tick", indexed: true }, { type: "address", name: "maker", indexed: true }, { type: "uint256", name: "amount", indexed: false }] },
];
export const FACTORY_ABI = [
    { type: "function", name: "createMarket", inputs: [{ type: "string", name: "question" }, { type: "address", name: "_resolver" }], outputs: [{ type: "address" }], stateMutability: "nonpayable" },
    { type: "function", name: "getMarketCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "getAllMarkets", inputs: [], outputs: [{ type: "address[]" }], stateMutability: "view" },
    { type: "event", name: "MarketCreated", inputs: [{ type: "address", name: "market", indexed: true }, { type: "string", name: "question", indexed: false }, { type: "address", name: "creator", indexed: true }, { type: "address", name: "resolver", indexed: true }, { type: "uint256", name: "index", indexed: false }] },
];
export const BENCHMARK_ABI = [
    { type: "function", name: "placeOrder", inputs: [{ type: "uint256", name: "amount" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "globalCounter", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "getOrderCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "event", name: "OrderPlaced", inputs: [{ type: "uint256", name: "orderId", indexed: true }, { type: "address", name: "maker", indexed: true }, { type: "uint256", name: "amount", indexed: false }] },
];
//# sourceMappingURL=abis.js.map