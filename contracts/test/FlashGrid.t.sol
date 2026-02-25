// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FlashGrid} from "../src/FlashGrid.sol";
import {FlashGridFactory} from "../src/FlashGridFactory.sol";
import {ParallelBenchmark} from "../src/ParallelBenchmark.sol";

contract FlashGridTest is Test {
    FlashGrid public grid;
    FlashGridFactory public factory;
    ParallelBenchmark public benchmark;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    function setUp() public {
        factory = new FlashGridFactory();
        address marketAddr = factory.createMarket("Will MON reach $10 by Q2?");
        grid = FlashGrid(payable(marketAddr));
        benchmark = new ParallelBenchmark();

        // Fund test users
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // ═══════════════════════════════════════════════════════════
    //                     DEPOSIT TESTS
    // ═══════════════════════════════════════════════════════════

    function test_Deposit() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        assertEq(grid.balances(alice), 1 ether);
    }

    function test_DepositViaReceive() public {
        vm.prank(alice);
        (bool success,) = address(grid).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(grid.balances(alice), 1 ether);
    }

    function test_RevertDepositZero() public {
        vm.prank(alice);
        vm.expectRevert(FlashGrid.ZeroAmount.selector);
        grid.deposit{value: 0}();
    }

    function test_MultipleDeposits() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        grid.deposit{value: 2 ether}();
        vm.stopPrank();

        assertEq(grid.balances(alice), 3 ether);
    }

    // ═══════════════════════════════════════════════════════════
    //                    WITHDRAW TESTS
    // ═══════════════════════════════════════════════════════════

    function test_Withdraw() public {
        vm.startPrank(alice);
        grid.deposit{value: 5 ether}();

        uint256 balBefore = alice.balance;
        grid.withdraw(3 ether);
        uint256 balAfter = alice.balance;

        assertEq(grid.balances(alice), 2 ether);
        assertEq(balAfter - balBefore, 3 ether);
        vm.stopPrank();
    }

    function test_RevertWithdrawInsufficientBalance() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();

        vm.expectRevert(FlashGrid.InsufficientBalance.selector);
        grid.withdraw(2 ether);
        vm.stopPrank();
    }

    function test_RevertWithdrawZero() public {
        vm.prank(alice);
        vm.expectRevert(FlashGrid.ZeroAmount.selector);
        grid.withdraw(0);
    }

    // ═══════════════════════════════════════════════════════════
    //                  ORDER PLACEMENT TESTS
    // ═══════════════════════════════════════════════════════════

    function test_PlaceOrder() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        grid.placeOrder(5, 0.5 ether, true); // Tick 5, 0.5 ETH, YES
        vm.stopPrank();

        // Balance reduced
        assertEq(grid.balances(alice), 0.5 ether);

        // Tick state updated
        (uint128 yesLiq, uint128 noLiq, uint32 orderCount,) = grid.getTickState(5);
        assertEq(yesLiq, 0.5 ether);
        assertEq(noLiq, 0);
        assertEq(orderCount, 1);
    }

    function test_PlaceOrderDifferentTicks() public {
        // Alice places at tick 3, Bob at tick 15 - different storage slots
        vm.prank(alice);
        grid.deposit{value: 2 ether}();

        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(3, 1 ether, true);

        vm.prank(bob);
        grid.placeOrder(15, 1 ether, false);

        // Each tick has independent state
        (uint128 yesLiq3,,uint32 count3,) = grid.getTickState(3);
        assertEq(yesLiq3, 1 ether);
        assertEq(count3, 1);

        (, uint128 noLiq15, uint32 count15,) = grid.getTickState(15);
        assertEq(noLiq15, 1 ether);
        assertEq(count15, 1);
    }

    function test_RevertPlaceOrderInvalidTick() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();

        vm.expectRevert(FlashGrid.InvalidTick.selector);
        grid.placeOrder(20, 0.5 ether, true); // Tick 20 is out of range
        vm.stopPrank();
    }

    function test_RevertPlaceOrderInsufficientBalance() public {
        vm.startPrank(alice);
        grid.deposit{value: 0.1 ether}();

        vm.expectRevert(FlashGrid.InsufficientBalance.selector);
        grid.placeOrder(5, 1 ether, true);
        vm.stopPrank();
    }

    function test_RevertPlaceOrderZeroAmount() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();

        vm.expectRevert(FlashGrid.ZeroAmount.selector);
        grid.placeOrder(5, 0, true);
        vm.stopPrank();
    }

    function test_MultipleOrdersSameTick() public {
        vm.prank(alice);
        grid.deposit{value: 5 ether}();
        vm.prank(bob);
        grid.deposit{value: 5 ether}();

        vm.prank(alice);
        grid.placeOrder(10, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(10, 2 ether, false);

        (uint128 yesLiq, uint128 noLiq, uint32 count,) = grid.getTickState(10);
        assertEq(yesLiq, 1 ether);
        assertEq(noLiq, 2 ether);
        assertEq(count, 2);
    }

    // ═══════════════════════════════════════════════════════════
    //                    SETTLEMENT TESTS
    // ═══════════════════════════════════════════════════════════

    function test_SettleTick() public {
        // Setup: Alice YES, Bob NO at same tick
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        // Settle tick 5
        grid.settleTick(5);

        // Tick state should be cleared
        (uint128 yesLiq, uint128 noLiq, uint32 count, uint32 lastEpoch) = grid.getTickState(5);
        assertEq(yesLiq, 0);
        assertEq(noLiq, 0);
        assertEq(count, 0);
        assertEq(lastEpoch, 1); // Epoch 1
    }

    function test_RevertSettleTickAlreadySettled() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);

        grid.settleTick(5);

        vm.expectRevert(FlashGrid.AlreadySettled.selector);
        grid.settleTick(5);
    }

    function test_SettleAll() public {
        // Setup: orders across multiple ticks
        vm.prank(alice);
        grid.deposit{value: 10 ether}();
        vm.prank(bob);
        grid.deposit{value: 10 ether}();

        // Place orders at ticks 2, 8, and 15
        vm.prank(alice);
        grid.placeOrder(2, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(2, 1 ether, false);

        vm.prank(alice);
        grid.placeOrder(8, 0.5 ether, true);
        vm.prank(bob);
        grid.placeOrder(8, 0.5 ether, false);

        vm.prank(alice);
        grid.placeOrder(15, 2 ether, true);
        vm.prank(bob);
        grid.placeOrder(15, 2 ether, false);

        // Settle all
        grid.settleAll();

        // All ticks should be settled
        for (uint8 i = 0; i < 20; i++) {
            (uint128 yesLiq, uint128 noLiq,,) = grid.getTickState(i);
            assertEq(yesLiq, 0);
            assertEq(noLiq, 0);
        }

        // Epoch should advance
        assertEq(grid.currentEpoch(), 2);
    }

    // ═══════════════════════════════════════════════════════════
    //                     VIEW FUNCTION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_GetAllTickStates() public {
        vm.prank(alice);
        grid.deposit{value: 5 ether}();

        vm.prank(alice);
        grid.placeOrder(0, 1 ether, true);
        vm.prank(alice);
        grid.placeOrder(19, 0.5 ether, false);

        FlashGrid.TickState[20] memory states = grid.getAllTickStates();

        assertEq(states[0].totalYesLiquidity, 1 ether);
        assertEq(states[0].orderCount, 1);
        assertEq(states[19].totalNoLiquidity, 0.5 ether);
        assertEq(states[19].orderCount, 1);

        // Empty ticks
        assertEq(states[10].orderCount, 0);
    }

    function test_GetTickOrders() public {
        vm.prank(alice);
        grid.deposit{value: 5 ether}();

        vm.prank(alice);
        grid.placeOrder(7, 1 ether, true);

        FlashGrid.Order[] memory orders = grid.getTickOrders(7);
        assertEq(orders.length, 1);
        assertEq(orders[0].maker, alice);
        assertEq(orders[0].amount, 1 ether);
        assertTrue(orders[0].isYes);
    }

    function test_GetTickOrderCount() public {
        vm.prank(alice);
        grid.deposit{value: 5 ether}();
        vm.prank(bob);
        grid.deposit{value: 5 ether}();

        vm.prank(alice);
        grid.placeOrder(3, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(3, 1 ether, false);

        assertEq(grid.getTickOrderCount(3), 2);
    }

    // ═══════════════════════════════════════════════════════════
    //                     FACTORY TESTS
    // ═══════════════════════════════════════════════════════════

    function test_FactoryCreateMarket() public {
        assertEq(factory.getMarketCount(), 1); // From setUp

        address market2 = factory.createMarket("Will ETH hit $5000?");
        assertEq(factory.getMarketCount(), 2);
        assertTrue(market2 != address(0));
    }

    function test_FactoryRevertDuplicateMarket() public {
        vm.expectRevert(FlashGridFactory.MarketAlreadyExists.selector);
        factory.createMarket("Will MON reach $10 by Q2?"); // Same as setUp
    }

    function test_FactoryGetAllMarkets() public {
        factory.createMarket("Market 2");
        factory.createMarket("Market 3");

        address[] memory allMarkets = factory.getAllMarkets();
        assertEq(allMarkets.length, 3); // 1 from setUp + 2 new
    }

    // ═══════════════════════════════════════════════════════════
    //                   BENCHMARK TESTS
    // ═══════════════════════════════════════════════════════════

    function test_BenchmarkPlaceOrder() public {
        benchmark.placeOrder(100);
        assertEq(benchmark.globalCounter(), 1);
        assertEq(benchmark.getOrderCount(), 1);
    }

    function test_BenchmarkSequentialOrders() public {
        for (uint256 i = 0; i < 10; i++) {
            benchmark.placeOrder(i * 100);
        }
        assertEq(benchmark.globalCounter(), 10);
        assertEq(benchmark.getOrderCount(), 10);
    }

    // ═══════════════════════════════════════════════════════════
    //                    EVENT EMISSION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_EmitOrderPlaced() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        vm.expectEmit(true, true, false, true);
        emit FlashGrid.OrderPlaced(5, alice, 0.5 ether, true, 1);

        vm.prank(alice);
        grid.placeOrder(5, 0.5 ether, true);
    }

    function test_EmitTickSettled() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        vm.expectEmit(true, false, false, true);
        emit FlashGrid.TickSettled(5, 1, 1 ether, 1 ether, 30); // tick 5 → price = (5+1)*5 = 30

        grid.settleTick(5);
    }

    // ═══════════════════════════════════════════════════════════
    //                   METADATA TESTS
    // ═══════════════════════════════════════════════════════════

    function test_MarketMetadata() public view {
        assertEq(grid.marketQuestion(), "Will MON reach $10 by Q2?");
        assertEq(grid.factory(), address(factory));
        assertEq(grid.currentEpoch(), 1);
        assertEq(grid.NUM_TICKS(), 20);
    }
}
