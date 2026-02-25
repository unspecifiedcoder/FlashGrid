// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {FlashGridFactory} from "../src/FlashGridFactory.sol";
import {ParallelBenchmark} from "../src/ParallelBenchmark.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Factory
        FlashGridFactory factory = new FlashGridFactory();
        console2.log("FlashGridFactory deployed at:", address(factory));

        // 2. Create default market via factory
        address market = factory.createMarket("Will MON reach $10 by Q2 2025?");
        console2.log("FlashGrid market deployed at:", market);

        // 3. Deploy ParallelBenchmark for comparison
        ParallelBenchmark benchmark = new ParallelBenchmark();
        console2.log("ParallelBenchmark deployed at:", address(benchmark));

        vm.stopBroadcast();

        // Output addresses for scripts
        console2.log("\n=== Deployment Summary ===");
        console2.log("Factory:   ", address(factory));
        console2.log("Market:    ", market);
        console2.log("Benchmark: ", address(benchmark));
        console2.log("Chain ID:  ", block.chainid);
    }
}
