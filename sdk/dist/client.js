// High-level client for interacting with FlashGrid markets.
import { createPublicClient, http, parseEther, formatEther, } from "viem";
import { FLASHGRID_ABI } from "./abis";
import { getChain } from "./chains";
export class FlashGridClient {
    constructor(config) {
        this.chainId = config.chainId;
        this.chain = getChain(config.chainId);
        this.marketAddress = config.marketAddress;
        this.factoryAddress = config.factoryAddress;
        this.publicClient = createPublicClient({
            chain: {
                id: this.chain.id,
                name: this.chain.name,
                nativeCurrency: this.chain.nativeCurrency,
                rpcUrls: this.chain.rpcUrls,
            },
            transport: http(this.chain.rpcUrls.default.http[0]),
        });
    }
    // ── Read Methods ────────────────────────────────────────────
    async getBalance(address) {
        const bal = await this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "balances",
            args: [address],
        });
        return formatEther(bal);
    }
    async getTickState(tick) {
        return this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "getTickState",
            args: [tick],
        });
    }
    async getAllTickStates() {
        return this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "getAllTickStates",
        });
    }
    async isResolved() {
        return this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "resolved",
        });
    }
    async getOutcome() {
        return this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "outcomeYes",
        });
    }
    async getCurrentEpoch() {
        return this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "currentEpoch",
        });
    }
    async getMarketQuestion() {
        return this.publicClient.readContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "marketQuestion",
        });
    }
    // ── Write Methods ───────────────────────────────────────────
    async deposit(walletClient, amount) {
        const hash = await walletClient.writeContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "deposit",
            value: parseEther(amount),
            chain: this.publicClient.chain,
            account: walletClient.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async withdraw(walletClient, amount) {
        const hash = await walletClient.writeContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "withdraw",
            args: [parseEther(amount)],
            chain: this.publicClient.chain,
            account: walletClient.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async placeOrder(walletClient, tick, amount, isYes) {
        const hash = await walletClient.writeContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "placeOrder",
            args: [tick, parseEther(amount), isYes],
            chain: this.publicClient.chain,
            account: walletClient.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async cancelOrder(walletClient, tick, orderIndex) {
        const hash = await walletClient.writeContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "cancelOrder",
            args: [tick, orderIndex],
            chain: this.publicClient.chain,
            account: walletClient.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async resolveMarket(walletClient, outcomeYes) {
        const hash = await walletClient.writeContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "resolveMarket",
            args: [outcomeYes],
            chain: this.publicClient.chain,
            account: walletClient.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
    async settleAll(walletClient) {
        const hash = await walletClient.writeContract({
            address: this.marketAddress,
            abi: FLASHGRID_ABI,
            functionName: "settleAll",
            chain: this.publicClient.chain,
            account: walletClient.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }
}
//# sourceMappingURL=client.js.map