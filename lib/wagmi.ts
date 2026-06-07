// Web3 config for the frontend. Defines the Monad testnet chain (from the deploy-generated
// CHAIN constant) and a wagmi config. Person 2 can pass `monadTestnet` to RainbowKit's
// getDefaultConfig instead of using `wagmiConfig` directly — either way the chain def is shared.
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { CHAIN } from "./contracts";

export const monadTestnet = defineChain({
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [CHAIN.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: CHAIN.explorer },
  },
  testnet: true,
});

// Minimal config (MetaMask / injected). Swap for RainbowKit's getDefaultConfig if preferred —
// keep `chains: [monadTestnet]` and the same transport.
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(CHAIN.rpcUrl),
  },
});

/** Build a Monad explorer link for a tx hash (used by the live feed). */
export function txUrl(hash: string) {
  return `${CHAIN.explorer}/tx/${hash}`;
}

/** Build a Monad explorer link for an address. */
export function addressUrl(address: string) {
  return `${CHAIN.explorer}/address/${address}`;
}
