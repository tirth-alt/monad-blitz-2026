import { createPublicClient, defineChain, http } from 'viem';
import { env } from '../../env';

export const monadTestnet = defineChain({
  id: env.MONAD_CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [env.MONAD_RPC_URL] } },
  blockExplorers: { default: { name: 'Monad Explorer', url: env.MONAD_EXPLORER_URL } },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(env.MONAD_RPC_URL),
});

export function txUrl(txHash: string): string {
  return `${env.MONAD_EXPLORER_URL}/tx/${txHash}`;
}
