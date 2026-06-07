import type { Abi, AbiEvent, Address } from 'viem';
import { queryOne, run } from '../../db';
import { env } from '../../env';
import { logger } from '../../logger';
import { publishEvent } from '../feed';
import { agentRegistryEvents, reputationStoreEvents, taskMarketplaceEvents } from './abis';
import { publicClient } from './client';

const LAST_BLOCK_KEY = 'chain:lastBlock';
// Cap the scan window so a long gap doesn't request a huge range from the RPC.
const MAX_BLOCK_SPAN = 2000n;

async function getLastBlock(): Promise<bigint | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM app_state WHERE key = ?', [LAST_BLOCK_KEY]);
  return row ? BigInt(row.value) : null;
}

async function setLastBlock(block: bigint): Promise<void> {
  await run(
    `INSERT INTO app_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [LAST_BLOCK_KEY, block.toString()],
  );
}

function serializeArgs(args: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args ?? {})) out[k] = typeof v === 'bigint' ? v.toString() : v;
  return out;
}

const CONTRACTS: Array<{ address?: string; abi: Abi; label: string }> = [
  { address: env.AGENT_REGISTRY_ADDRESS, abi: agentRegistryEvents, label: 'AgentRegistry' },
  { address: env.TASK_MARKETPLACE_ADDRESS, abi: taskMarketplaceEvents, label: 'TaskMarketplace' },
  { address: env.REPUTATION_STORE_ADDRESS, abi: reputationStoreEvents, label: 'ReputationStore' },
];

/**
 * Poll Monad for new contract events since the last processed block and persist
 * them as feed events. Designed to be called by a Vercel Cron (replaces the
 * long-running watcher, which serverless can't host). Safe no-op until Person 1
 * sets the contract addresses.
 */
export async function pollChain(): Promise<{ processed: number; skipped?: string }> {
  const active = CONTRACTS.filter((c) => c.address);
  if (active.length === 0) return { processed: 0, skipped: 'no contract addresses configured' };

  const latest = await publicClient.getBlockNumber();
  let last = await getLastBlock();

  // First run: start from the tip so we only capture new activity.
  if (last === null) {
    await setLastBlock(latest);
    return { processed: 0, skipped: 'initialized cursor at current block' };
  }

  let fromBlock = last + 1n;
  if (fromBlock > latest) return { processed: 0 };
  if (latest - fromBlock > MAX_BLOCK_SPAN) fromBlock = latest - MAX_BLOCK_SPAN;

  let processed = 0;
  for (const c of active) {
    const logs = await publicClient.getLogs({
      address: c.address as Address,
      events: c.abi as unknown as AbiEvent[],
      fromBlock,
      toBlock: latest,
    });
    for (const log of logs) {
      const decoded = log as typeof log & { eventName?: string; args?: Record<string, unknown> };
      await publishEvent({
        type: decoded.eventName ?? 'UnknownEvent',
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number(log.blockNumber) : null,
        payload: serializeArgs(decoded.args),
      });
      processed++;
    }
  }

  await setLastBlock(latest);
  logger.info({ processed, fromBlock: fromBlock.toString(), toBlock: latest.toString() }, 'chain poll complete');
  return { processed };
}
