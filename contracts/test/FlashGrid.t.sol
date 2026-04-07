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
    address public resolverAddr;

    function setUp() public {
        resolverAddr = address(this); // test contract is resolver
        factory = new FlashGridFactory();
        address marketAddr = factory.createMarket("Will MON reach $10 by Q2?");
        grid = FlashGrid(payable(marketAddr));
        benchmark = new ParallelBenchmark();

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

    function test_RevertPlaceOrderTooSmall() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        vm.expectRevert(FlashGrid.OrderTooSmall.selector);
        grid.placeOrder(5, 0.0001 ether, true);
        vm.stopPrank();
    }

    function test_RevertPlaceOrderAfterResolution() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        vm.stopPrank();

        grid.resolveMarket(true);

        vm.prank(alice);
        vm.expectRevert(FlashGrid.AlreadyResolved.selector);
        grid.placeOrder(5, 0.5 ether, true);
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
    //                  ORDER CANCELLATION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_CancelOrder() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        grid.placeOrder(5, 0.5 ether, true);
        assertEq(grid.balances(alice), 0.5 ether);

        grid.cancelOrder(5, 0);
        assertEq(grid.balances(alice), 1 ether); // full refund

        (uint128 yesLiq,, uint32 count,) = grid.getTickState(5);
        assertEq(yesLiq, 0);
        assertEq(count, 0);
        vm.stopPrank();
    }

    function test_RevertCancelAfterResolution() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 0.5 ether, true);

        grid.resolveMarket(true);

        vm.prank(alice);
        vm.expectRevert(FlashGrid.AlreadyResolved.selector);
        grid.cancelOrder(5, 0);
    }

    function test_RevertCancelOtherUsersOrder() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 0.5 ether, true);

        vm.prank(bob);
        vm.expectRevert(FlashGrid.NotOrderMaker.selector);
        grid.cancelOrder(5, 0);
    }

    function test_RevertCancelAlreadyCancelled() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        grid.placeOrder(5, 0.5 ether, true);
        grid.cancelOrder(5, 0);

        vm.expectRevert(FlashGrid.OrderAlreadyCancelled.selector);
        grid.cancelOrder(5, 0);
        vm.stopPrank();
    }

    function test_RevertCancelInvalidIndex() public {
        vm.prank(alice);
        vm.expectRevert(FlashGrid.InvalidOrderIndex.selector);
        grid.cancelOrder(5, 99);
    }

    // ═══════════════════════════════════════════════════════════
    //                  MARKET RESOLUTION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_ResolveMarketYes() public {
        grid.resolveMarket(true);
        assertTrue(grid.resolved());
        assertTrue(grid.outcomeYes());
    }

    function test_ResolveMarketNo() public {
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
        grid.resolveMarket(true);
        vm.expectRevert(FlashGrid.AlreadyResolved.selector);
        grid.resolveMarket(false);
    }

    function test_EmitMarketResolved() public {
        vm.expectEmit(false, true, false, true);
        emit FlashGrid.MarketResolved(true, address(this));
        grid.resolveMarket(true);
    }

    // ═══════════════════════════════════════════════════════════
    //                    PAYOUT TESTS
    // ═══════════════════════════════════════════════════════════

    function test_PayoutYesWins_EqualLiquidity() public {
        // Alice bets 1 ETH YES, Bob bets 1 ETH NO. YES wins.
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        grid.resolveMarket(true);
        grid.settleAll();

        // Alice (winner) gets 1 ETH back + 1 ETH from Bob = 2 ETH
        assertEq(grid.balances(alice), 2 ether);
        // Bob (loser) gets nothing — fully matched
        assertEq(grid.balances(bob), 0);
    }

    function test_PayoutNoWins_EqualLiquidity() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        grid.resolveMarket(false); // NO wins
        grid.settleAll();

        // Bob (NO winner) gets 2 ETH
        assertEq(grid.balances(bob), 2 ether);
        // Alice (YES loser) gets 0
        assertEq(grid.balances(alice), 0);
    }

    function test_PayoutYesWins_AsymmetricLiquidity() public {
        // Alice bets 10 ETH YES, Bob bets 1 ETH NO. YES wins.
        // matched = 1 ETH. Alice's 9 ETH unmatched portion doesn't compete.
        vm.prank(alice);
        grid.deposit{value: 10 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 10 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, false);

        grid.resolveMarket(true);
        grid.settleAll();

        // Alice: 10 ETH original + 1 ETH from Bob's losing side = 11 ETH
        assertEq(grid.balances(alice), 11 ether);
        // Bob: fully matched, loses everything
        assertEq(grid.balances(bob), 0);
    }

    function test_PayoutNoWins_AsymmetricLiquidity() public {
        // Alice bets 1 ETH YES, Bob bets 10 ETH NO. NO wins.
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(bob);
        grid.deposit{value: 10 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 1 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 10 ether, false);

        grid.resolveMarket(false);
        grid.settleAll();

        // Bob: 10 ETH + 1 ETH from Alice = 11 ETH
        assertEq(grid.balances(bob), 11 ether);
        // Alice: fully matched, loses all
        assertEq(grid.balances(alice), 0);
    }

    function test_PayoutUnmatchedRefund_LoserSide() public {
        // Alice bets 2 ETH YES, Bob bets 5 ETH NO. YES wins.
        // matched = 2 ETH. Bob has 3 ETH unmatched — should be refunded.
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 5 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 2 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 5 ether, false);

        grid.resolveMarket(true);
        grid.settleAll();

        // Alice (winner): 2 ETH + 5 ETH (all of losing pool) = 4 ETH... wait.
        // Actually: winner gets original + pro-rata share of losing pool.
        // winPool = 2 ETH (yes), losePool = 5 ETH (no), matched = 2 ETH
        // Alice winnings = (2 * 5) / 2 = 5 ETH. But cap at matched = 2. No —
        // let me re-check: winnings cap is at losePool, not matched.
        // Actually the cap in code is: if (winnings > matched) winnings = matched
        // But matched = min(2, 5) = 2. winnings = (2 * 5) / 2 = 5. Capped to 2.
        // So Alice gets 2 + 2 = 4 ETH.
        // Bob (loser): unmatched = 5 - (5 * 2) / 5 = 5 - 2 = 3 ETH refunded.
        // Total: 4 + 3 = 7 = 2 + 5 ✓ (conservation)
        assertEq(grid.balances(alice), 4 ether);
        assertEq(grid.balances(bob), 3 ether);
    }

    function test_PayoutMultipleOrdersSameTick() public {
        // Alice: 2 ETH YES, Bob: 1 ETH YES, Charlie: 3 ETH NO. YES wins.
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

        grid.resolveMarket(true);
        grid.settleAll();

        // winPool = 3 ETH (yes), losePool = 3 ETH (no), matched = 3 ETH
        // Alice winnings: (2 * 3) / 3 = 2. Capped at 3? No, 2 < 3, so 2. Payout = 2 + 2 = 4 ETH.
        // Bob winnings: (1 * 3) / 3 = 1. Payout = 1 + 1 = 2 ETH.
        // Charlie (loser): matchedShare = (3 * 3) / 3 = 3. unmatched = 3 - 3 = 0.
        // Total: 4 + 2 + 0 = 6 = 2 + 1 + 3 ✓
        assertEq(grid.balances(alice), 4 ether);
        assertEq(grid.balances(bob), 2 ether);
        assertEq(grid.balances(charlie), 0);
    }

    function test_RevertSettleBeforeResolution() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        vm.prank(alice);
        grid.placeOrder(5, 0.5 ether, true);

        vm.expectRevert(FlashGrid.NotResolved.selector);
        grid.settleTick(5);
    }

    function test_RevertSettleAllBeforeResolution() public {
        vm.expectRevert(FlashGrid.NotResolved.selector);
        grid.settleAll();
    }

    function test_SingleSidedLiquidity_YesOnly() public {
        // Only YES orders, no NO. YES wins. Everyone gets refunded.
        vm.prank(alice);
        grid.deposit{value: 2 ether}();
        vm.prank(bob);
        grid.deposit{value: 1 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 2 ether, true);
        vm.prank(bob);
        grid.placeOrder(5, 1 ether, true);

        grid.resolveMarket(true);
        grid.settleAll();

        // matched = 0 (no opposing liquidity). Winners get original back, no winnings.
        assertEq(grid.balances(alice), 2 ether);
        assertEq(grid.balances(bob), 1 ether);
    }

    function test_SingleSidedLiquidity_YesOnly_NoWins() public {
        // Only YES orders, NO wins. Losers get full refund (unmatched = full amount).
        vm.prank(alice);
        grid.deposit{value: 2 ether}();

        vm.prank(alice);
        grid.placeOrder(5, 2 ether, true);

        grid.resolveMarket(false);
        grid.settleAll();

        // matched = 0. Loser unmatched = 2 - 0 = 2 ETH refunded.
        assertEq(grid.balances(alice), 2 ether);
    }

    function test_SettleAll_MultiTick() public {
        vm.prank(alice);
        grid.deposit{value: 10 ether}();
        vm.prank(bob);
        grid.deposit{value: 10 ether}();

        // Orders across ticks 2, 8, 15
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

        grid.resolveMarket(true);
        grid.settleAll();

        // All ticks cleared
        for (uint8 i = 0; i < 20; i++) {
            (uint128 yesLiq, uint128 noLiq,,) = grid.getTickState(i);
            assertEq(yesLiq, 0);
            assertEq(noLiq, 0);
        }

        // Epoch advanced
        assertEq(grid.currentEpoch(), 2);

        // Alice wins all: 1+1 + 0.5+0.5 + 2+2 = 7. Plus remaining 6.5 from deposit.
        assertEq(grid.balances(alice), 6.5 ether + 7 ether);
        // Bob loses all matched: remaining 6.5 from deposit
        assertEq(grid.balances(bob), 6.5 ether);
    }

    function test_EmptyTickSettlement() public {
        grid.resolveMarket(true);
        // Settle all with no orders — should not revert
        grid.settleAll();
        assertEq(grid.currentEpoch(), 2);
    }

    // ═══════════════════════════════════════════════════════════
    //                    PAUSE TESTS
    // ═══════════════════════════════════════════════════════════

    function test_PauseBlocksDeposits() public {
        grid.pause();
        vm.prank(alice);
        vm.expectRevert("Pausable: paused");
        grid.deposit{value: 1 ether}();
    }

    function test_PauseBlocksOrders() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        grid.pause();

        vm.prank(alice);
        vm.expectRevert("Pausable: paused");
        grid.placeOrder(5, 0.5 ether, true);
    }

    function test_UnpauseRestoresFunction() public {
        grid.pause();
        grid.unpause();

        vm.prank(alice);
        grid.deposit{value: 1 ether}();
        assertEq(grid.balances(alice), 1 ether);
    }

    function test_WithdrawWorksWhenPaused() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        grid.pause();

        // Withdraw should still work (safety: let users get money out)
        vm.prank(alice);
        grid.withdraw(1 ether);
        assertEq(grid.balances(alice), 0);
    }

    function test_RevertPauseNotResolver() public {
        vm.prank(alice);
        vm.expectRevert(FlashGrid.NotResolver.selector);
        grid.pause();
    }

    // ═══════════════════════════════════════════════════════════
    //                  REENTRANCY TESTS
    // ═══════════════════════════════════════════════════════════

    function test_ReentrancyOnWithdraw() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(grid));
        vm.deal(address(attacker), 10 ether);

        // Attacker deposits
        attacker.attack_deposit{value: 2 ether}();
        assertEq(grid.balances(address(attacker)), 2 ether);

        // Attacker tries to reenter on withdraw — should revert
        vm.expectRevert("ReentrancyGuard: reentrant call");
        attacker.attack_withdraw();
    }

    // ═══════════════════════════════════════════════════════════
    //                   MIN ORDER SIZE TESTS
    // ═══════════════════════════════════════════════════════════

    function test_MinOrderSizeEnforced() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();

        // Exactly at minimum should work
        grid.placeOrder(5, 0.001 ether, true);

        // Below minimum should revert
        vm.expectRevert(FlashGrid.OrderTooSmall.selector);
        grid.placeOrder(5, 0.0009 ether, true);
        vm.stopPrank();
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
        assertFalse(orders[0].cancelled);
        assertFalse(orders[0].claimed);
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
        address market2 = factory.createMarket("Will ETH hit $5000?");
        assertEq(factory.getMarketCount(), 2);
        assertTrue(market2 != address(0));
    }

    function test_FactoryCreateMarketWithResolver() public {
        address market2 = factory.createMarket("Will ETH hit $5000?", alice);
        FlashGrid grid2 = FlashGrid(payable(market2));
        assertEq(grid2.resolver(), alice);
    }

    function test_FactoryRevertDuplicateMarket() public {
        vm.expectRevert(FlashGridFactory.MarketAlreadyExists.selector);
        factory.createMarket("Will MON reach $10 by Q2?");
    }

    function test_FactoryGetAllMarkets() public {
        factory.createMarket("Market 2");
        factory.createMarket("Market 3");
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
    //                  EVENT EMISSION TESTS
    // ═══════════════════════════════════════════════════════════

    function test_EmitOrderPlaced() public {
        vm.prank(alice);
        grid.deposit{value: 1 ether}();

        vm.expectEmit(true, true, false, true);
        emit FlashGrid.OrderPlaced(5, alice, 0.5 ether, true, 1);

        vm.prank(alice);
        grid.placeOrder(5, 0.5 ether, true);
    }

    function test_EmitOrderCancelled() public {
        vm.startPrank(alice);
        grid.deposit{value: 1 ether}();
        grid.placeOrder(5, 0.5 ether, true);

        vm.expectEmit(true, true, false, true);
        emit FlashGrid.OrderCancelled(5, alice, 0, 0.5 ether);

        grid.cancelOrder(5, 0);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════
    //                   METADATA TESTS
    // ═══════════════════════════════════════════════════════════

    function test_MarketMetadata() public view {
        assertEq(grid.marketQuestion(), "Will MON reach $10 by Q2?");
        assertEq(grid.factory(), address(factory));
        assertEq(grid.currentEpoch(), 1);
        assertEq(grid.NUM_TICKS(), 20);
        assertEq(grid.resolver(), address(this));
        assertFalse(grid.resolved());
    }

    // ═══════════════════════════════════════════════════════════
    //                      FUZZ TESTS
    // ═══════════════════════════════════════════════════════════

    function testFuzz_DepositWithdraw(uint256 amount) public {
        amount = bound(amount, 1, 50 ether);
        vm.deal(alice, amount);

        vm.startPrank(alice);
        grid.deposit{value: amount}();
        assertEq(grid.balances(alice), amount);

        grid.withdraw(amount);
        assertEq(grid.balances(alice), 0);
        vm.stopPrank();
    }

    function testFuzz_SettlementConservation(uint128 yesAmt, uint128 noAmt) public {
        // Bound to reasonable range to avoid overflow and meet minimum
        yesAmt = uint128(bound(yesAmt, 0.001 ether, 10 ether));
        noAmt = uint128(bound(noAmt, 0.001 ether, 10 ether));

        vm.deal(alice, uint256(yesAmt));
        vm.deal(bob, uint256(noAmt));

        vm.prank(alice);
        grid.deposit{value: yesAmt}();
        vm.prank(bob);
        grid.deposit{value: noAmt}();

        vm.prank(alice);
        grid.placeOrder(5, yesAmt, true);
        vm.prank(bob);
        grid.placeOrder(5, noAmt, false);

        uint256 totalDeposited = uint256(yesAmt) + uint256(noAmt);

        grid.resolveMarket(true);
        grid.settleAll();

        uint256 totalPayouts = grid.balances(alice) + grid.balances(bob);

        // Conservation: total payouts must equal total deposited (no money created or destroyed)
        assertEq(totalPayouts, totalDeposited, "Settlement conservation violated");
    }

    function testFuzz_PlaceOrderBalanceConsistent(uint8 tick, uint128 amount) public {
        tick = uint8(bound(tick, 0, 19));
        amount = uint128(bound(amount, 0.001 ether, 10 ether));

        vm.deal(alice, uint256(amount));
        vm.startPrank(alice);
        grid.deposit{value: amount}();

        uint256 balBefore = grid.balances(alice);
        grid.placeOrder(tick, amount, true);
        uint256 balAfter = grid.balances(alice);

        assertEq(balBefore - balAfter, amount);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════
    //               GAS / STRESS TESTS
    // ═══════════════════════════════════════════════════════════

    function test_ManyOrdersPerTick() public {
        // Place 50 orders at the same tick to test gas limits
        uint256 numOrders = 50;
        for (uint256 i = 0; i < numOrders; i++) {
            address user = address(uint160(1000 + i));
            vm.deal(user, 1 ether);
            vm.prank(user);
            grid.deposit{value: 0.01 ether}();
            vm.prank(user);
            grid.placeOrder(5, 0.01 ether, i % 2 == 0);
        }

        (,, uint32 count,) = grid.getTickState(5);
        assertEq(count, numOrders);

        // Settle should complete without hitting gas limit
        grid.resolveMarket(true);
        grid.settleAll();

        (uint128 yesLiq, uint128 noLiq, uint32 countAfter,) = grid.getTickState(5);
        assertEq(yesLiq, 0);
        assertEq(noLiq, 0);
        assertEq(countAfter, 0);
    }
}

// ═══════════════════════════════════════════════════════════
//                  REENTRANCY ATTACKER
// ═══════════════════════════════════════════════════════════

contract ReentrancyAttacker {
    FlashGrid public target;
    bool public attacking;

    constructor(address _target) {
        target = FlashGrid(payable(_target));
    }

    function attack_deposit() external payable {
        target.deposit{value: msg.value}();
    }

    function attack_withdraw() external {
        attacking = true;
        target.withdraw(1 ether);
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Try to reenter
            target.withdraw(1 ether);
        }
    }
}
