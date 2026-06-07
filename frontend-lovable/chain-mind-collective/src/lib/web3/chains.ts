import { defineChain } from "viem";

// Monad Testnet.
// ⚠️ Confirm these values with your blockchain teammate / the official Monad docs —
// chain id, RPC URL and explorer URL are the things most likely to change.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
});
