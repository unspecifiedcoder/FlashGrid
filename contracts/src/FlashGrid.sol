// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FlashGrid - Parallel Batch Auction Engine
/// @notice State-sharded order matching engine optimized for parallel execution.
/// @dev Each price tick uses isolated storage slots to enable conflict-free parallel processing.
///      Settlement happens after market resolution — winners take the matched pot.
contract FlashGrid {
    // ═══════════════════════════════════════════════════════════
    //                     REENTRANCY GUARD
    // ═══════════════════════════════════════════════════════════

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _reentrancyStatus = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ═══════════════════════════════════════════════════════════
    //                        PAUSABLE
    // ═══════════════════════════════════════════════════════════

    bool private _paused;

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    // ═══════════════════════════════════════════════════════════
    //                        CONSTANTS
    // ═══════════════════════════════════════════════════════════

    uint8 public constant NUM_TICKS = 20;
    uint32 public constant EPOCH_DURATION = 12;
    uint128 public constant MIN_ORDER_SIZE = 0.001 ether;

    // ═══════════════════════════════════════════════════════════
    //                         TYPES
    // ═══════════════════════════════════════════════════════════

    struct TickState {
        uint128 totalYesLiquidity;
        uint128 totalNoLiquidity;
        uint32 orderCount;
        uint32 lastSettledEpoch;
    }

    struct Order {
        address maker;
        uint128 amount;
        bool isYes;
        uint32 epoch;
        bool cancelled;
        bool claimed;
    }

    // ═══════════════════════════════════════════════════════════
    //                         STORAGE
    // ═══════════════════════════════════════════════════════════

    /// @notice Isolated tick state — each tick occupies its own storage slot range
    mapping(uint8 => TickState) public ticks;

    /// @notice Orders per tick — isolated arrays, no cross-tick conflicts
    mapping(uint8 => Order[]) public tickOrders;

    /// @notice User balance ledger — only touched on deposit/withdraw
    mapping(address => uint256) public balances;

    /// @notice Current epoch number
    uint32 public currentEpoch;

    /// @notice Market metadata
    string public marketQuestion;
    address public factory;
    address public creator;

    /// @notice Market resolution state
    address public resolver;
    bool public resolved;
    bool public outcomeYes;

    // ═══════════════════════════════════════════════════════════
    //                         EVENTS
    // ═══════════════════════════════════════════════════════════

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event OrderPlaced(
        uint8 indexed tick, address indexed maker, uint128 amount, bool isYes, uint32 epoch
    );
    event OrderCancelled(uint8 indexed tick, address indexed maker, uint256 orderIndex, uint128 amount);
    event TickSettled(
        uint8 indexed tick, uint32 epoch, uint128 yesMatched, uint128 noMatched, uint256 clearingPrice
    );
    event EpochCompleted(uint32 epoch, uint256 totalVolume, uint16 ticksActive);
    event MarketResolved(bool outcomeYes, address indexed resolvedBy);
    event PayoutClaimed(uint8 indexed tick, address indexed maker, uint256 amount);
    event Paused(address account);
    event Unpaused(address account);

    // ═══════════════════════════════════════════════════════════
    //                        ERRORS
    // ═══════════════════════════════════════════════════════════

    error InvalidTick();
    error InsufficientBalance();
    error ZeroAmount();
    error OrderTooSmall();
    error WithdrawFailed();
    error NotResolver();
    error AlreadyResolved();
    error NotResolved();
    error NotOrderMaker();
    error OrderAlreadyCancelled();
    error OrderAlreadyClaimed();
    error InvalidOrderIndex();

    // ═══════════════════════════════════════════════════════════
    //                      CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    constructor(string memory _marketQuestion, address _creator, address _resolver) {
        marketQuestion = _marketQuestion;
        creator = _creator;
        resolver = _resolver;
        factory = msg.sender;
        currentEpoch = 1;
    }

    // ═══════════════════════════════════════════════════════════
    //                      MODIFIERS
    // ═══════════════════════════════════════════════════════════

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    // ═══════════════════════════════════════════════════════════
    //                    ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function pause() external onlyResolver {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyResolver {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    function paused() external view returns (bool) {
        return _paused;
    }

    // ═══════════════════════════════════════════════════════════
    //                    DEPOSIT / WITHDRAW
    // ═══════════════════════════════════════════════════════════

    /// @notice Deposit native token to participate in markets
    function deposit() external payable whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw available balance
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        balances[msg.sender] -= amount;

        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) revert WithdrawFailed();

        emit Withdrawn(msg.sender, amount);
    }

    // ═══════════════════════════════════════════════════════════
    //                     ORDER PLACEMENT
    // ═══════════════════════════════════════════════════════════

    /// @notice Place an order at a specific price tick
    /// @dev PARALLELISM KEY: Only touches ticks[tick] and tickOrders[tick].
    ///      Orders at different ticks have ZERO storage conflicts.
    function placeOrder(uint8 tick, uint128 amount, bool isYes) external whenNotPaused {
        if (tick >= NUM_TICKS) revert InvalidTick();
        if (amount == 0) revert ZeroAmount();
        if (amount < MIN_ORDER_SIZE) revert OrderTooSmall();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        if (resolved) revert AlreadyResolved();

        balances[msg.sender] -= amount;

        TickState storage ts = ticks[tick];
        if (isYes) {
            ts.totalYesLiquidity += amount;
        } else {
            ts.totalNoLiquidity += amount;
        }
        ts.orderCount++;

        tickOrders[tick].push(Order({
            maker: msg.sender,
            amount: amount,
            isYes: isYes,
            epoch: currentEpoch,
            cancelled: false,
            claimed: false
        }));

        emit OrderPlaced(tick, msg.sender, amount, isYes, currentEpoch);
    }

    // ═══════════════════════════════════════════════════════════
    //                    ORDER CANCELLATION
    // ═══════════════════════════════════════════════════════════

    /// @notice Cancel an open order before market resolution
    function cancelOrder(uint8 tick, uint256 orderIndex) external {
        if (tick >= NUM_TICKS) revert InvalidTick();
        if (resolved) revert AlreadyResolved();

        Order[] storage orders = tickOrders[tick];
        if (orderIndex >= orders.length) revert InvalidOrderIndex();

        Order storage order = orders[orderIndex];
        if (order.maker != msg.sender) revert NotOrderMaker();
        if (order.cancelled) revert OrderAlreadyCancelled();

        order.cancelled = true;
        uint128 refundAmount = order.amount;

        // Update tick state
        TickState storage ts = ticks[tick];
        if (order.isYes) {
            ts.totalYesLiquidity -= refundAmount;
        } else {
            ts.totalNoLiquidity -= refundAmount;
        }
        ts.orderCount--;

        // Refund to balance
        balances[msg.sender] += refundAmount;

        emit OrderCancelled(tick, msg.sender, orderIndex, refundAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //                    MARKET RESOLUTION
    // ═══════════════════════════════════════════════════════════

    /// @notice Resolve the market outcome — only callable by resolver
    function resolveMarket(bool _outcomeYes) external onlyResolver {
        if (resolved) revert AlreadyResolved();

        resolved = true;
        outcomeYes = _outcomeYes;

        emit MarketResolved(_outcomeYes, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════
    //                       SETTLEMENT
    // ═══════════════════════════════════════════════════════════

    /// @notice Settle a single tick after market resolution
    /// @dev PARALLELISM KEY: Each tick settles independently.
    ///      Winners get their share + the losing side's matched amount.
    ///      Unmatched orders on the excess side get refunded.
    function settleTick(uint8 tick) public nonReentrant {
        if (tick >= NUM_TICKS) revert InvalidTick();
        if (!resolved) revert NotResolved();

        TickState storage ts = ticks[tick];

        uint128 yesLiq = ts.totalYesLiquidity;
        uint128 noLiq = ts.totalNoLiquidity;
        uint128 matched = yesLiq < noLiq ? yesLiq : noLiq;

        Order[] storage orders = tickOrders[tick];
        uint256 len = orders.length;

        uint128 winPool = outcomeYes ? yesLiq : noLiq;
        uint128 losePool = outcomeYes ? noLiq : yesLiq;

        for (uint256 i = 0; i < len; i++) {
            Order storage order = orders[i];
            if (order.cancelled || order.claimed || order.amount == 0) continue;

            order.claimed = true;
            uint128 orderAmt = order.amount;
            bool isWinner = (order.isYes == outcomeYes);

            if (isWinner) {
                // Winner: gets back full amount + pro-rata share of losing pool
                uint128 winnings = 0;
                if (winPool > 0 && matched > 0) {
                    winnings = uint128((uint256(orderAmt) * uint256(losePool)) / uint256(winPool));
                    // Cap winnings at matched amount to prevent overflow
                    if (winnings > matched) winnings = matched;
                }
                uint256 payout = uint256(orderAmt) + uint256(winnings);
                balances[order.maker] += payout;
                emit PayoutClaimed(tick, order.maker, payout);
            } else {
                // Loser: gets back only the unmatched portion
                uint128 pool = order.isYes ? yesLiq : noLiq;
                uint128 matchedShare = 0;
                if (pool > 0) {
                    matchedShare = uint128((uint256(orderAmt) * uint256(matched)) / uint256(pool));
                }
                uint128 unmatched = orderAmt - matchedShare;
                if (unmatched > 0) {
                    balances[order.maker] += uint256(unmatched);
                    emit PayoutClaimed(tick, order.maker, uint256(unmatched));
                }
            }
        }

        // Emit settlement event
        uint256 clearingPrice = uint256(tick + 1) * 5;
        emit TickSettled(tick, currentEpoch, matched, matched, clearingPrice);

        // Reset tick state
        ts.totalYesLiquidity = 0;
        ts.totalNoLiquidity = 0;
        ts.orderCount = 0;
        ts.lastSettledEpoch = currentEpoch;
    }

    /// @notice Settle all ticks and advance epoch
    function settleAll() external {
        if (!resolved) revert NotResolved();

        uint256 totalVolume = 0;
        uint16 activeTickCount = 0;

        for (uint8 i = 0; i < NUM_TICKS; i++) {
            TickState storage ts = ticks[i];
            if (ts.orderCount > 0 && ts.lastSettledEpoch < currentEpoch) {
                uint128 tickVolume = ts.totalYesLiquidity + ts.totalNoLiquidity;
                totalVolume += uint256(tickVolume);
                activeTickCount++;
                settleTick(i);
            }
        }

        emit EpochCompleted(currentEpoch, totalVolume, activeTickCount);
        currentEpoch++;
    }

    // ═══════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function getTickState(uint8 tick)
        external
        view
        returns (uint128 yesLiquidity, uint128 noLiquidity, uint32 orderCount, uint32 lastSettledEpoch)
    {
        if (tick >= NUM_TICKS) revert InvalidTick();
        TickState storage ts = ticks[tick];
        return (ts.totalYesLiquidity, ts.totalNoLiquidity, ts.orderCount, ts.lastSettledEpoch);
    }

    function getAllTickStates() external view returns (TickState[20] memory states) {
        for (uint8 i = 0; i < NUM_TICKS; i++) {
            states[i] = ticks[i];
        }
    }

    function getTickOrders(uint8 tick) external view returns (Order[] memory) {
        if (tick >= NUM_TICKS) revert InvalidTick();
        return tickOrders[tick];
    }

    function getTickOrderCount(uint8 tick) external view returns (uint256) {
        if (tick >= NUM_TICKS) revert InvalidTick();
        return tickOrders[tick].length;
    }

    receive() external payable {
        if (msg.value == 0) revert ZeroAmount();
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
