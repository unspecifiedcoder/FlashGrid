// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FlashGrid} from "./FlashGrid.sol";

/// @title FlashGridFactory - Market Deployer
/// @notice Deploys new FlashGrid instances for different markets using CREATE2
contract FlashGridFactory {
    // ═══════════════════════════════════════════════════════════
    //                         STORAGE
    // ═══════════════════════════════════════════════════════════

    address[] public markets;
    mapping(bytes32 => address) public marketsByHash;

    // ═══════════════════════════════════════════════════════════
    //                         EVENTS
    // ═══════════════════════════════════════════════════════════

    event MarketCreated(address indexed market, string question, address indexed creator, address indexed resolver, uint256 index);

    // ═══════════════════════════════════════════════════════════
    //                        ERRORS
    // ═══════════════════════════════════════════════════════════

    error MarketAlreadyExists();

    // ═══════════════════════════════════════════════════════════
    //                       FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Deploy a new FlashGrid market with a dedicated resolver
    /// @param question The market question
    /// @param _resolver Address authorized to resolve the market outcome
    /// @return market The address of the deployed FlashGrid contract
    function createMarket(string calldata question, address _resolver) external returns (address market) {
        bytes32 questionHash = keccak256(abi.encodePacked(question));
        if (marketsByHash[questionHash] != address(0)) revert MarketAlreadyExists();

        bytes32 salt = questionHash;
        FlashGrid grid = new FlashGrid{salt: salt}(question, msg.sender, _resolver);
        market = address(grid);

        markets.push(market);
        marketsByHash[questionHash] = market;

        emit MarketCreated(market, question, msg.sender, _resolver, markets.length - 1);
    }

    /// @notice Deploy a new FlashGrid market (creator is also resolver)
    function createMarket(string calldata question) external returns (address market) {
        bytes32 questionHash = keccak256(abi.encodePacked(question));
        if (marketsByHash[questionHash] != address(0)) revert MarketAlreadyExists();

        bytes32 salt = questionHash;
        FlashGrid grid = new FlashGrid{salt: salt}(question, msg.sender, msg.sender);
        market = address(grid);

        markets.push(market);
        marketsByHash[questionHash] = market;

        emit MarketCreated(market, question, msg.sender, msg.sender, markets.length - 1);
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }
}
