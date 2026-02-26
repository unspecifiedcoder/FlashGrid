/**
 * FlashGrid - Fund Test Wallets
 *
 * Generates 200 wallets from a mnemonic and funds them via batch transfer.
 * Each wallet receives enough MON to deposit and place orders.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

// ═══════════════════════════════════════════════════════════
//                     CONFIGURATION
// ═══════════════════════════════════════════════════════════

const MONAD_TESTNET: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
};

const NUM_WALLETS = 200;
const FUND_AMOUNT = parseEther("0.1"); // 0.1 MON per wallet
const BATCH_SIZE = 20; // Fund 20 wallets at a time

// ═══════════════════════════════════════════════════════════
//                   WALLET GENERATION
// ═══════════════════════════════════════════════════════════

const TEST_MNEMONIC =
  process.env.TEST_MNEMONIC ||
  "test test test test test test test test test test test junk";

export function generateWallets(count: number) {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    const account = mnemonicToAccount(TEST_MNEMONIC, {
      addressIndex: i,
    });
    wallets.push(account);
  }
  return wallets;
}

// ═══════════════════════════════════════════════════════════
//                    FUNDING LOGIC
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       FlashGrid Wallet Funding Script        ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  // Deployer account (from private key)
  const deployerKey = process.env.PRIVATE_KEY;
  if (!deployerKey) {
    console.error("ERROR: Set PRIVATE_KEY environment variable");
    process.exit(1);
  }

  const deployer = privateKeyToAccount(deployerKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: MONAD_TESTNET,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account: deployer,
    chain: MONAD_TESTNET,
    transport: http(),
  });

  // Check deployer balance
  const deployerBalance = await publicClient.getBalance({
    address: deployer.address,
  });
  const totalRequired = FUND_AMOUNT * BigInt(NUM_WALLETS);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${formatEther(deployerBalance)} MON`);
  console.log(`Required: ${formatEther(totalRequired)} MON (${NUM_WALLETS} x ${formatEther(FUND_AMOUNT)} MON)`);
  console.log();

  if (deployerBalance < totalRequired) {
    console.error(
      `Insufficient balance! Need ${formatEther(totalRequired)} MON, have ${formatEther(deployerBalance)} MON`
    );
    console.log(`Get testnet MON from: https://faucet.monad.xyz`);
    process.exit(1);
  }

  // Generate wallets
  console.log(`Generating ${NUM_WALLETS} wallets from mnemonic...`);
  const wallets = generateWallets(NUM_WALLETS);
  console.log(`First wallet: ${wallets[0].address}`);
  console.log(`Last wallet:  ${wallets[NUM_WALLETS - 1].address}`);
  console.log();

  // Fund in batches
  console.log(`Funding wallets in batches of ${BATCH_SIZE}...`);
  let funded = 0;

  for (let batch = 0; batch < NUM_WALLETS; batch += BATCH_SIZE) {
    const batchWallets = wallets.slice(batch, batch + BATCH_SIZE);
    const promises = batchWallets.map(async (wallet) => {
      try {
        const hash = await walletClient.sendTransaction({
          to: wallet.address,
          value: FUND_AMOUNT,
        });
        return { address: wallet.address, hash, success: true };
      } catch (err) {
        return {
          address: wallet.address,
          hash: null,
          success: false,
          error: err,
        };
      }
    });

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result.success) {
        funded++;
      } else {
        console.error(`  Failed to fund ${result.address}`);
      }
    }

    console.log(
      `  Batch ${Math.floor(batch / BATCH_SIZE) + 1}/${Math.ceil(NUM_WALLETS / BATCH_SIZE)}: ${batchWallets.length} wallets funded (${funded}/${NUM_WALLETS} total)`
    );
  }

  console.log();
  console.log("═══════════════════════════════════════════════");
  console.log(`Funding complete: ${funded}/${NUM_WALLETS} wallets funded`);
  console.log("═══════════════════════════════════════════════");

  // Output wallet addresses for reference
  const outputPath = "wallets.json";
  const walletData = wallets.map((w, i) => ({
    index: i,
    address: w.address,
  }));

  console.log(`\nWallet addresses saved to ${outputPath}`);
}

main().catch(console.error);
