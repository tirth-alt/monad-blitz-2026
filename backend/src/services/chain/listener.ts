import type { Abi, Address, Log } from 'viem';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { publishEvent } from '../feed.js';
import { agentRegistryEvents, reputationStoreEvents, taskMarketplaceEvents } from './abis.js';
import { publicClient } from './client.js';

/** JSON can't serialize BigInt — convert event args to plain strings. */
function serializeArgs(args: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args ?? {})) {
    out[k] = typeof v === 'bigint' ? v.toString() : v;
  }
  return out;
}

function watch(address: Address, abi: Abi, label: string): () => void {
  return publicClient.watchContractEvent({
    address,
    abi,
    onLogs: (logs: Log[]) => {
      for (const log of logs) {
        const decoded = log as Log & { eventName?: string; args?: Record<string, unknown> };
        const type = decoded.eventName ?? 'UnknownEvent';
        publishEvent({
          type,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ? Number(log.blockNumber) : null,
          payload: serializeArgs(decoded.args),
        });
        logger.debug({ type, tx: log.transactionHash }, `chain event (${label})`);
      }
    },
    onError: (err) => logger.warn({ err, label }, 'watchContractEvent error'),
  });
}

let unwatchers: Array<() => void> = [];

/**
 * Start watching all configured contracts. Any contract whose address is not
 * set in env is simply skipped — so the backend runs fine before Person 1 has
 * deployed anything. Safe to call once at startup.
 */
export function startChainListener(): void {
  const targets: Array<{ address?: string; abi: Abi; label: string }> = [
    { address: env.AGENT_REGISTRY_ADDRESS, abi: agentRegistryEvents, label: 'AgentRegistry' },
    {
      address: env.TASK_MARKETPLACE_ADDRESS,
      abi: taskMarketplaceEvents,
      label: 'TaskMarketplace',
    },
    {
      address: env.REPUTATION_STORE_ADDRESS,
      abi: reputationStoreEvents,
      label: 'ReputationStore',
    },
  ];

  for (const t of targets) {
    if (!t.address) {
      logger.warn(`${t.label}: address not set — skipping event listener`);
      continue;
    }
    try {
      unwatchers.push(watch(t.address as Address, t.abi, t.label));
      logger.info({ address: t.address }, `watching ${t.label} events`);
    } catch (err) {
      logger.error({ err, label: t.label }, 'failed to start watcher');
    }
  }
}

export function stopChainListener(): void {
  for (const un of unwatchers) un();
  unwatchers = [];
}
