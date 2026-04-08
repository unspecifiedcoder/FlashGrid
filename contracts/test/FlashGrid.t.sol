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

    address public deployer = makeAddr("deployer");
    address public resolverAddr = makeAddr("resolver");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    function setUp() public {
        vm.prank(deployer);
        factory = new FlashGridFactory();

        vm.prank(deployer);
        address marketAddr = factory.createMarket("Will MON reach $10 by Q2?", resolverAddr);
        grid = FlashGrid(payable(marketAddr));

        benchmark = new ParallelBenchmark();

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
        vm.deal(resolverAddr, 1 ether);
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
        grid.placeOrder(5, 0.5 ether, true);
        vm.stopPrank();

        assertEq(grid.balances(alice), 0.5 ether);
        (uint128 yesLiq, uint128 noLiq, uint32 orderCount,) = grid.getTickState(5);
        assertEq(yesLiq, 0.5 ether);
        assertEq(noLiq, 0);
        assertEq(orderCount, 1);
    }

    function test_PlaceOrderDifferentTicks() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(3, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(15, 1 ether, false);

        (uint128 yesLiq3,, uint32 count3,) = grid.getTickState(3);
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
        grid.placeOrder(20, 0.5 ether, true);
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

    function test_RevertPlaceOrderBelowMinSize() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        vm.expectRevert(FlashGrid.OrderTooSmall.selector);
        grid.placeOrder(5, 0.0001 ether, true);
        vm.stopPrank();
    }

    function test_RevertPlaceOrderAfterResolution() public {
        vm.prank(resolverAddr);
        grid.resolveMarket(true);

        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        vm.expectRevert(FlashGrid.AlreadyResolved.selector);
        grid.placeOrder(5, 0.5 ether, true);
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
    //                 ORDER CANCELLATION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_CancelOrder() public {
        vm.startPrank(alice);
        grid.deposit{value: 2 ether}();
        grid.placeOrder(5, 1 ether, true);
        assertEq(grid.balances(alice), 1 ether);

        grid.cancelOrder(5, 0);
        assertEq(grid.balances(alice), 2 ether);
        vm.stopPrank();

        (uint128 yesLiq,, uint32 count,) = grid.getTickState(5);
        assertEq(yesLiq, 0);
        assertEq(count, 0);
    }

    function test_RevertCancelNotMaker() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);

        vm.prank(bob);
        vm.expectRevert(FlashGrid.NotOrderMaker.selector);
        grid.cancelOrder(5, 0);
    }

    function test_RevertCancelAlreadyCancelled() public {
        vm.startPrank(alice);
        grid.deposit{value: 2 ether}();
        grid.placeOrder(5, 1 ether, true);
        grid.cancelOrder(5, 0);

        vm.expectRevert(FlashGrid.OrderAlreadyCancelled.selector);
        grid.cancelOrder(5, 0);
        vm.stopPrank();
    }

    function test_RevertCancelAfterResolution() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);

        vm.prank(alice);
        vm.expectRevert(FlashGrid.AlreadyResolved.selector);
        grid.cancelOrder(5, 0);
    }

    function test_RevertCancelInvalidOrderIndex() public {
        vm.startPrank(alice);
        grid.deposit{value: 2 ether}();
        grid.placeOrder(5, 1 ether, true);

        vm.expectRevert(FlashGrid.InvalidOrderIndex.selector);
        grid.cancelOrder(5, 99);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════
    //                  MARKET RESOLUTION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_ResolveMarketYes() public {
        vm.prank(resolverAddr);
        grid.resolveMarket(true);

        assertTrue(grid.resolved());
        assertTrue(grid.outcomeYes());
    }

    function test_ResolveMarketNo() public {
        vm.prank(resolverAddr);
        grid.resolveMarket(false);

        assertTrue(grid.resolved());
        assertFalse(grid.outcomeYes());
    }

    function test_RevertResolveNotResolver() public {
        vm.prank(alice);
        vm.expectRevert(FlashGrid.NotResolver.selector);
        grid.resolveMarket(true);
    }

    function test_RevertResolveAlreadyResolved() public {
        vm.prank(resolverAddr);
        grid.resolveMarket(true);

        vm.prank(resolverAddr);
        vm.expectRevert(FlashGrid.AlreadyResolved.selector);
        grid.resolveMarket(false);
    }

    function test_ResolveEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit FlashGrid.MarketResolved(true, resolverAddr);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
    }

    // ═══════════════════════════════════════════════════════════
    //                    SETTLEMENT TESTS
    // ═══════════════════════════════════════════════════════════

    function test_SettleTick_EqualLiquidity_YesWins() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        // Alice (winner): 1 remaining + 2 payout
        // Bob (loser): 1 remaining + 0 payout
        assertEq(grid.balances(alice), 1 ether + 2 ether);
        assertEq(grid.balances(bob), 1 ether);

        (uint128 yesLiq, uint128 noLiq, uint32 count,) = grid.getTickState(5);
        assertEq(yesLiq, 0);
        assertEq(noLiq, 0);
        assertEq(count, 0);
    }

    function test_SettleTick_EqualLiquidity_NoWins() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(false);
        grid.settleTick(5);

        assertEq(grid.balances(bob), 1 ether + 2 ether);
        assertEq(grid.balances(alice), 1 ether);
    }

    function test_SettleTick_AsymmetricLiquidity_BigYesSmallNo_YesWins() public {
        vm.prank(alice);
        grid.deposit{value: 10 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 10 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        // matched = 1, winPool=10, losePool=1
        // Alice (winner): winnings = (10*1)/10 = 1. Payout = 10+1 = 11
        // Bob (loser): matchedShare = (1*1)/1 = 1. Refund = 0
        assertEq(grid.balances(alice), 11 ether);
        assertEq(grid.balances(bob), 0);
    }

    function test_SettleTick_AsymmetricLiquidity_BigYesSmallNo_NoWins() public {
        vm.prank(alice);
        grid.deposit{value: 10 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 10 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(false);
        grid.settleTick(5);

        // matched=1, winPool=1(NO), losePool=10(YES)
        // Bob (winner): winnings = (1*10)/1 = 10, capped at matched=1. Payout = 1+1 = 2
        // Alice (loser): matchedShare = (10*1)/10 = 1. Refund = 9
        assertEq(grid.balances(bob), 2 ether);
        assertEq(grid.balances(alice), 9 ether);
    }

    function test_SettleTick_MultipleWinners() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();
        vm.prank(charlie);
        grid.deposit{value: 3 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 2 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(charlie);
        grid.placeOrder(5, 3 ether, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        // matched=3, winPool=3(YES), losePool=3(NO)
        // Alice: winnings = (2*3)/3 = 2. Payout = 2+2 = 4
        // Bob: winnings = (1*3)/3 = 1. Payout = 1+1 = 2
        // Charlie: matchedShare = (3*3)/3 = 3. Refund = 0
        assertEq(grid.balances(alice), 4 ether);
        assertEq(grid.balances(bob), 2 ether);
        assertEq(grid.balances(charlie), 0);
    }

    function test_SettleTick_SingleSidedLiquidity_YesOnly_YesWins() public {
        vm.prank(alice);
        grid.deposit{value: 5 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 5 ether, true);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        // matched=0, winner gets back full amount
        assertEq(grid.balances(alice), 5 ether);
    }

    function test_SettleTick_SingleSidedLiquidity_YesOnly_NoWins() public {
        vm.prank(alice);
        grid.deposit{value: 5 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 5 ether, true);

        vm.prank(resolverAddr);
        grid.resolveMarket(false);
        grid.settleTick(5);

        // matched=0, loser matchedShare=0, unmatched=full -> refund
        assertEq(grid.balances(alice), 5 ether);
    }

    function test_RevertSettleBeforeResolution() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 0.5 ether, true);

        vm.expectRevert(FlashGrid.NotResolved.selector);
        grid.settleTick(5);
    }

    function test_SettleAll() public {
        vm.prank(alice);
        grid.deposit{value: 10 ether}();
        vm.prank(bob);
        grid.deposit{value: 10 ether}();

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

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleAll();

        for (uint8 i = 0; i < 20; i++) {
            (uint128 yesLiq, uint128 noLiq,,) = grid.getTickState(i);
            assertEq(yesLiq, 0);
            assertEq(noLiq, 0);
        }
        assertEq(grid.currentEpoch(), 2);
    }

    function test_RevertSettleAllBeforeResolution() public {
        vm.expectRevert(FlashGrid.NotResolved.selector);
        grid.settleAll();
    }

    function test_SettleTick_CancelledOrdersSkipped() public {
        vm.prank(alice);
        grid.deposit{value: 3 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true); // order 0
        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true); // order 1
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false); // order 2

        vm.prank(alice);
        grid.cancelOrder(5, 0);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        // After cancel: 1 ETH YES (order 1) vs 1 ETH NO
        // Alice: 1 ETH refund from cancel + 2 ETH payout = 3 ETH
        // Bob: 0 (loser, fully matched)
        assertEq(grid.balances(alice), 3 ether);
        assertEq(grid.balances(bob), 0);
    }

    // ═══════════════════════════════════════════════════════════
    //             SETTLEMENT CONSERVATION (FUZZ)
    // ═══════════════════════════════════════════════════════════

    function testFuzz_SettlementConservation(uint128 yesAmt, uint128 noAmt) public {
        yesAmt = uint128(bound(uint256(yesAmt), 0.001 ether, 100 ether));
        noAmt = uint128(bound(uint256(noAmt), 0.001 ether, 100 ether));

        vm.deal(alice, uint256(yesAmt) + 1 ether);
        vm.deal(bob, uint256(noAmt) + 1 ether);

        vm.prank(alice);
        grid.deposit{value: yesAmt}();
        vm.prank(bob);
        grid.deposit{value: noAmt}();

        vm.prank(alice);
        grid.placeOrder(5, yesAmt, true);
        vm.prank(bob);
        grid.placeOrder(5, noAmt, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        uint256 totalOut = grid.balances(alice) + grid.balances(bob);
        uint256 totalIn = uint256(yesAmt) + uint256(noAmt);

        // Conservation: no money created
        assertLe(totalOut, totalIn, "Settlement created money");
        // Max 2 wei rounding loss (1 per order)
        assertGe(totalOut + 2, totalIn, "Settlement destroyed too much money");
    }

    function testFuzz_DepositWithdraw(uint256 amount) public {
        amount = bound(amount, 1, 50 ether);
        vm.deal(alice, amount);

        vm.startPrank(alice);
        grid.deposit{value: amount}();
        assertEq(grid.balances(alice), amount);
        grid.withdraw(amount);
        assertEq(grid.balances(alice), 0);
        assertEq(alice.balance, amount);
        vm.stopPrank();
    }

    function testFuzz_PlaceOrderBalanceConsistent(uint8 tick, uint128 amount) public {
        tick = uint8(bound(uint256(tick), 0, 19));
        amount = uint128(bound(uint256(amount), 0.001 ether, 10 ether));

        vm.deal(alice, uint256(amount) + 1 ether);
        vm.startPrank(alice);
        grid.deposit{value: amount}();
        uint256 balBefore = grid.balances(alice);
        grid.placeOrder(tick, amount, true);
        uint256 balAfter = grid.balances(alice);
        assertEq(balBefore - balAfter, amount);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════
    //                     PAUSE TESTS
    // ═══════════════════════════════════════════════════════════

    function test_PauseBlocksDeposits() public {
        vm.prank(resolverAddr);
        grid.pause();

        vm.prank(alice);
        vm.expectRevert("Pausable: paused");
        grid.deposit{value: 1 ether}();
    }

    function test_PauseBlocksOrders() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        vm.prank(resolverAddr);
        grid.pause();

        vm.prank(alice);
        vm.expectRevert("Pausable: paused");
        grid.placeOrder(5, 0.5 ether, true);
    }

    function test_UnpauseRestoresFunction() public {
        vm.prank(resolverAddr);
        grid.pause();
        vm.prank(resolverAddr);
        grid.unpause();

        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        assertEq(grid.balances(alice), 1 ether);
    }

    function test_WithdrawWorksWhenPaused() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        vm.prank(resolverAddr);
        grid.pause();

        vm.prank(alice);
        grid.withdraw(1 ether);
        assertEq(grid.balances(alice), 0);
    }

    // ═══════════════════════════════════════════════════════════
    //                 REENTRANCY PROTECTION TEST
    // ═══════════════════════════════════════════════════════════

    function test_ReentrancyOnWithdraw() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(grid));
        vm.deal(address(attacker), 10 ether);

        attacker.deposit{value: 2 ether}();

        vm.expectRevert("ReentrancyGuard: reentrant call");
        attacker.attack();
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
        assertEq(factory.getMarketCount(), 1);

        vm.prank(deployer);
        address market2 = factory.createMarket("Will ETH hit $5000?");
        assertEq(factory.getMarketCount(), 2);
        assertTrue(market2 != address(0));

        FlashGrid grid2 = FlashGrid(payable(market2));
        assertEq(grid2.creator(), deployer);
        assertEq(grid2.resolver(), deployer);
    }

    function test_FactoryCreateMarketWithResolver() public {
        vm.prank(deployer);
        address market2 = factory.createMarket("Will ETH hit $5000?", alice);

        FlashGrid grid2 = FlashGrid(payable(market2));
        assertEq(grid2.creator(), deployer);
        assertEq(grid2.resolver(), alice);
    }

    function test_FactoryRevertDuplicateMarket() public {
        vm.prank(deployer);
        vm.expectRevert(FlashGridFactory.MarketAlreadyExists.selector);
        factory.createMarket("Will MON reach $10 by Q2?");
    }

    function test_FactoryGetAllMarkets() public {
        vm.startPrank(deployer);
        factory.createMarket("Market 2");
        factory.createMarket("Market 3");
        vm.stopPrank();

        address[] memory allMarkets = factory.getAllMarkets();
        assertEq(allMarkets.length, 3);
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

        vm.prank(resolverAddr);
        grid.resolveMarket(true);

        vm.expectEmit(true, false, false, true);
        emit FlashGrid.TickSettled(5, 1, 1 ether, 1 ether, 30);

        grid.settleTick(5);
    }

    // ═══════════════════════════════════════════════════════════
    //                   METADATA TESTS
    // ═══════════════════════════════════════════════════════════

    function test_MarketMetadata() public view {
        assertEq(grid.marketQuestion(), "Will MON reach $10 by Q2?");
        assertEq(grid.factory(), address(factory));
        assertEq(grid.resolver(), resolverAddr);
        assertEq(grid.currentEpoch(), 1);
        assertEq(grid.NUM_TICKS(), 20);
    }

    // ═══════════════════════════════════════════════════════════
    //                   EDGE CASE TESTS
    // ═══════════════════════════════════════════════════════════

    function test_EmptyTickSettlement() public {
        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleTick(5);

        (uint128 yesLiq, uint128 noLiq, uint32 count,) = grid.getTickState(5);
        assertEq(yesLiq, 0);
        assertEq(noLiq, 0);
        assertEq(count, 0);
    }

    function test_SettleAllWithNoOrders() public {
        vm.prank(resolverAddr);
        grid.resolveMarket(true);
        grid.settleAll();
        assertEq(grid.currentEpoch(), 2);
    }

    function test_MinOrderSizeBoundary() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        grid.placeOrder(5, 0.001 ether, true);
        assertEq(grid.getTickOrderCount(5), 1);
        vm.stopPrank();
    }

    function test_SettleTickIdempotent() public {
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        vm.prank(resolverAddr);
        grid.resolveMarket(true);

        grid.settleTick(5);
        uint256 aliceBal = grid.balances(alice);
        uint256 bobBal = grid.balances(bob);

        // Second settle is a no-op (orders already claimed)
        grid.settleTick(5);
        assertEq(grid.balances(alice), aliceBal);
        assertEq(grid.balances(bob), bobBal);
    }
}

// ═══════════════════════════════════════════════════════════
//                  ATTACK CONTRACTS
// ═══════════════════════════════════════════════════════════

contract ReentrancyAttacker {
    FlashGrid public grid;
    uint256 public attackCount;

    constructor(address _grid) {
        grid = FlashGrid(payable(_grid));
    }

    function deposit() external payable {
        grid.deposit{value: msg.value}();
    }

    function attack() external {
        grid.withdraw(1 ether);
    }

    receive() external payable {
        if (attackCount < 2) {
            attackCount++;
            grid.withdraw(1 ether);
        }
    }
}
