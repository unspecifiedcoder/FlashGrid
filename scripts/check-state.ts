import { createPublicClient, http, formatEther } from "viem";

const c = createPublicClient({
  chain: { id: 10143, name: "Monad", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } } },
  transport: http(),
});

const ABI = [
  { type: "function", name: "currentEpoch", inputs: [], outputs: [{ type: "uint32" }], stateMutability: "view" },
  { type: "function", name: "getTickState", inputs: [{ type: "uint8", name: "tick" }], outputs: [{ type: "uint128" }, { type: "uint128" }, { type: "uint32" }, { type: "uint32" }], stateMutability: "view" },
] as const;

const addr = "0x89014cDeB2FDc07A0D99aD95FabC853620620666" as `0x${string}`;

async function main() {
  const epoch = await c.readContract({ address: addr, abi: ABI, functionName: "currentEpoch" });
  console.log("Current epoch:", Number(epoch));
  
  for (let t = 0; t < 20; t++) {
    const s = await c.readContract({ address: addr, abi: ABI, functionName: "getTickState", args: [t] });
    const yesLiq = s[0];
    const noLiq = s[1];
    const orders = Number(s[2]);
    const lastMatched = Number(s[3]);
    if (orders > 0 || lastMatched > 0) {
      console.log(`  Tick ${t}: yes=${formatEther(yesLiq)} no=${formatEther(noLiq)} orders=${orders} lastMatched=${lastMatched}`);
    }
  }
}

main().catch(console.error);
