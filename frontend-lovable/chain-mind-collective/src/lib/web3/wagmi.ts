import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "./chains";

// wagmi config — MetaMask (and any injected wallet) on Monad testnet.
// `ssr: true` + cookieStorage keeps state consistent through TanStack Start's
// server render so we don't get hydration mismatches on the connect button.
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
