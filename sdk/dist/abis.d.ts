export declare const FLASHGRID_ABI: readonly [{
    readonly type: "function";
    readonly name: "NUM_TICKS";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "MIN_ORDER_SIZE";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint128";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "currentEpoch";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "marketQuestion";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "resolver";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "resolved";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "outcomeYes";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "paused";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "balances";
    readonly inputs: readonly [{
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTickState";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128";
        readonly name: "yesLiquidity";
    }, {
        readonly type: "uint128";
        readonly name: "noLiquidity";
    }, {
        readonly type: "uint32";
        readonly name: "orderCount";
    }, {
        readonly type: "uint32";
        readonly name: "lastSettledEpoch";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getAllTickStates";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple[20]";
        readonly components: readonly [{
            readonly type: "uint128";
            readonly name: "totalYesLiquidity";
        }, {
            readonly type: "uint128";
            readonly name: "totalNoLiquidity";
        }, {
            readonly type: "uint32";
            readonly name: "orderCount";
        }, {
            readonly type: "uint32";
            readonly name: "lastSettledEpoch";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTickOrders";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "maker";
        }, {
            readonly type: "uint128";
            readonly name: "amount";
        }, {
            readonly type: "bool";
            readonly name: "isYes";
        }, {
            readonly type: "uint32";
            readonly name: "epoch";
        }, {
            readonly type: "bool";
            readonly name: "cancelled";
        }, {
            readonly type: "bool";
            readonly name: "claimed";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTickOrderCount";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "deposit";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "withdraw";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "placeOrder";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
    }, {
        readonly type: "uint128";
        readonly name: "amount";
    }, {
        readonly type: "bool";
        readonly name: "isYes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "cancelOrder";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
    }, {
        readonly type: "uint256";
        readonly name: "orderIndex";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "resolveMarket";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "_outcomeYes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "settleTick";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "settleAll";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "pause";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "unpause";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "Deposited";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "Withdrawn";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "OrderPlaced";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "maker";
        readonly indexed: true;
    }, {
        readonly type: "uint128";
        readonly name: "amount";
        readonly indexed: false;
    }, {
        readonly type: "bool";
        readonly name: "isYes";
        readonly indexed: false;
    }, {
        readonly type: "uint32";
        readonly name: "epoch";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "OrderCancelled";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "maker";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "orderIndex";
        readonly indexed: false;
    }, {
        readonly type: "uint128";
        readonly name: "amount";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "TickSettled";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "epoch";
        readonly indexed: false;
    }, {
        readonly type: "uint128";
        readonly name: "yesMatched";
        readonly indexed: false;
    }, {
        readonly type: "uint128";
        readonly name: "noMatched";
        readonly indexed: false;
    }, {
        readonly type: "uint256";
        readonly name: "clearingPrice";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "EpochCompleted";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "epoch";
        readonly indexed: false;
    }, {
        readonly type: "uint256";
        readonly name: "totalVolume";
        readonly indexed: false;
    }, {
        readonly type: "uint16";
        readonly name: "ticksActive";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "MarketResolved";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "outcomeYes";
        readonly indexed: false;
    }, {
        readonly type: "address";
        readonly name: "resolvedBy";
        readonly indexed: true;
    }];
}, {
    readonly type: "event";
    readonly name: "PayoutClaimed";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "tick";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "maker";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
        readonly indexed: false;
    }];
}];
export declare const FACTORY_ABI: readonly [{
    readonly type: "function";
    readonly name: "createMarket";
    readonly inputs: readonly [{
        readonly type: "string";
        readonly name: "question";
    }, {
        readonly type: "address";
        readonly name: "_resolver";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "getMarketCount";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getAllMarkets";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "MarketCreated";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "market";
        readonly indexed: true;
    }, {
        readonly type: "string";
        readonly name: "question";
        readonly indexed: false;
    }, {
        readonly type: "address";
        readonly name: "creator";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "resolver";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "index";
        readonly indexed: false;
    }];
}];
export declare const BENCHMARK_ABI: readonly [{
    readonly type: "function";
    readonly name: "placeOrder";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "globalCounter";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getOrderCount";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "OrderPlaced";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "maker";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
        readonly indexed: false;
    }];
}];
//# sourceMappingURL=abis.d.ts.map