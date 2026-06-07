import { createPublicClient, defineChain, http } from 'viem';
import { env } from '../../config/env.js';

/**
 * Monad testnet chain definition for viem. Values come from env so they can be
 * swapped (or pointed at a local Hardhat node) without code changes.
 */
export const monadTestnet = defineChain({
  id: env.MONAD_CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [env.MONAD_RPC_URL] } },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: env.MONAD_EXPLORER_URL },
  },
  testnet: true,
});

/** Read-only client used to watch contract events for the live feed. */
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(env.MONAD_RPC_URL),
});

/** Build an explorer link for a tx hash. */
export function txUrl(txHash: string): string {
  return `${env.MONAD_EXPLORER_URL}/tx/${txHash}`;
}
