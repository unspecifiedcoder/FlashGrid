// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FlashGrid} from "./FlashGrid.sol";

/// @title FlashGridFactory - Market Deployer
/// @notice Deploys new FlashGrid instances for different markets using CREATE2
contract FlashGridFactory {
    // ═══════════════════════════════════════════════════════════
    //                         STORAGE
    // ═══════════════════════════════════════════════════════════

    /// @notice Registry of all deployed markets
    address[] public markets;

    /// @notice Mapping from market question hash to deployed address
    mapping(bytes32 => address) public marketsByHash;

    // ═══════════════════════════════════════════════════════════
    //                         EVENTS
    // ═══════════════════════════════════════════════════════════

    event MarketCreated(address indexed market, string question, address indexed creator, uint256 index);

    // ═══════════════════════════════════════════════════════════
    //                        ERRORS
    // ═══════════════════════════════════════════════════════════

    error MarketAlreadyExists();

    // ═══════════════════════════════════════════════════════════
    //                       FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Deploy a new FlashGrid market
    /// @param question The market question (e.g., "Will MON reach $10 by Q2?")
    /// @return market The address of the deployed FlashGrid contract
    function createMarket(string calldata question) external returns (address market) {
        bytes32 questionHash = keccak256(abi.encodePacked(question));
        if (marketsByHash[questionHash] != address(0)) revert MarketAlreadyExists();

        // Deploy with CREATE2 for deterministic addresses
        bytes32 salt = questionHash;
        FlashGrid grid = new FlashGrid{salt: salt}(question, msg.sender);
        market = address(grid);

        markets.push(market);
        marketsByHash[questionHash] = market;

        emit MarketCreated(market, question, msg.sender, markets.length - 1);
    }

    /// @notice Get total number of deployed markets
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    /// @notice Get all deployed market addresses
    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }
}
