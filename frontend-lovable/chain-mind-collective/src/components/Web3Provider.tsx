import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/web3/wagmi";

// Provides wagmi/viem context to the whole app. Must sit inside a
// QueryClientProvider (wagmi uses TanStack Query under the hood).
export function Web3Provider({ children }: { children: ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
