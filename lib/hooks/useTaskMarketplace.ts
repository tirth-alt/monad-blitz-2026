// React hooks for the TaskMarketplace contract (wagmi v2 + viem).
// Reads (board/profile), writes (full task lifecycle + x402 instant pay), and an event watcher
// that powers the live transaction feed.
"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import type { Abi, Address, Log } from "viem";
import { parseEther } from "viem";
import { addresses, abis } from "../contracts";

const MARKET = addresses.TaskMarketplace as Address;
const MARKET_ABI = abis.TaskMarketplace as Abi;

/** On-chain task status (matches the Solidity enum order). */
export enum TaskStatus {
  Open = 0,
  Assigned = 1,
  Completed = 2,
  Cancelled = 3,
  Reclaimed = 4,
}

/** Mirror of the on-chain Task struct. */
export type Task = {
  id: bigint;
  poster: Address;
  agent: Address;
  description: string;
  category: string;
  reward: bigint;
  createdAt: bigint;
  deadline: bigint;
  status: number;
  instantSettle: boolean;
  resultHash: `0x${string}`;
};

// ── Reads ────────────────────────────────────────────────────────────

/** Tasks awaiting assignment (the "Open Tasks" column). */
export function useOpenTasks() {
  const { data, refetch, isLoading } = useReadContract({
    address: MARKET,
    abi: MARKET_ABI,
    functionName: "getOpenTasks",
  });
  return { tasks: (data as Task[] | undefined) ?? [], refetch, isLoading };
}

/** Every task (e.g. to split into Open / Completed columns). */
export function useAllTasks() {
  const { data, refetch, isLoading } = useReadContract({
    address: MARKET,
    abi: MARKET_ABI,
    functionName: "getAllTasks",
  });
  return { tasks: (data as Task[] | undefined) ?? [], refetch, isLoading };
}

/** A single task by id. */
export function useTask(taskId?: bigint) {
  const { data, refetch, isLoading } = useReadContract({
    address: MARKET,
    abi: MARKET_ABI,
    functionName: "getTask",
    args: taskId !== undefined ? [taskId] : undefined,
    query: { enabled: taskId !== undefined },
  });
  return { task: data as Task | undefined, refetch, isLoading };
}

/** All tasks assigned to / completed by an agent (for the profile page). */
export function useTasksByAgent(agent?: Address) {
  const { data, refetch, isLoading } = useReadContract({
    address: MARKET,
    abi: MARKET_ABI,
    functionName: "getTasksByAgent",
    args: agent ? [agent] : undefined,
    query: { enabled: !!agent },
  });
  return { tasks: (data as Task[] | undefined) ?? [], refetch, isLoading };
}

// ── Writes ───────────────────────────────────────────────────────────

/** Shared tx-lifecycle wrapper so every write hook exposes the same flags. */
function useTxWrite() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  return { writeContractAsync, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Post + fund a task. `rewardMon` is a decimal string in MON, e.g. "5". */
export function usePostTask() {
  const tx = useTxWrite();
  const postTask = (description: string, category: string, rewardMon: string, deadlineSeconds = 86400) =>
    tx.writeContractAsync({
      address: MARKET,
      abi: MARKET_ABI,
      functionName: "postTask",
      args: [description, category, BigInt(deadlineSeconds)],
      value: parseEther(rewardMon),
    });
  return { postTask, ...tx };
}

/** Assign a task to an agent (verifier only). */
export function useAssignTask() {
  const tx = useTxWrite();
  const assignTask = (taskId: bigint, agent: Address) =>
    tx.writeContractAsync({ address: MARKET, abi: MARKET_ABI, functionName: "assignTask", args: [taskId, agent] });
  return { assignTask, ...tx };
}

/** Complete a task: release payment + bump reputation (verifier only). */
export function useCompleteTask() {
  const tx = useTxWrite();
  const completeTask = (taskId: bigint, resultHash: `0x${string}`) =>
    tx.writeContractAsync({
      address: MARKET,
      abi: MARKET_ABI,
      functionName: "completeTask",
      args: [taskId, resultHash],
    });
  return { completeTask, ...tx };
}

/** Cancel an open task (poster only) — refunds the bounty. */
export function useCancelTask() {
  const tx = useTxWrite();
  const cancelTask = (taskId: bigint) =>
    tx.writeContractAsync({ address: MARKET, abi: MARKET_ABI, functionName: "cancelTask", args: [taskId] });
  return { cancelTask, ...tx };
}

/** Reclaim funds after the deadline for an uncompleted task (poster only). */
export function useReclaim() {
  const tx = useTxWrite();
  const reclaim = (taskId: bigint) =>
    tx.writeContractAsync({ address: MARKET, abi: MARKET_ABI, functionName: "reclaim", args: [taskId] });
  return { reclaim, ...tx };
}

/** x402 instant delegation pay to a trusted agent. `amountMon` is a decimal MON string. */
export function usePayAgentInstant() {
  const tx = useTxWrite();
  const payAgentInstant = (toAgent: Address, relatedTaskId: bigint, amountMon: string) =>
    tx.writeContractAsync({
      address: MARKET,
      abi: MARKET_ABI,
      functionName: "payAgentInstant",
      args: [toAgent, relatedTaskId],
      value: parseEther(amountMon),
    });
  return { payAgentInstant, ...tx };
}

// ── Events (live feed) ───────────────────────────────────────────────

/**
 * Subscribe to ALL TaskMarketplace events for the live transaction feed.
 * `onLogs` receives decoded logs; each log has `eventName` and `args` (e.g. "TaskCompleted",
 * "PaymentReleased", "InstantPayment"). Filter/format inside the callback.
 */
export function useWatchTaskEvents(onLogs: (logs: Log[]) => void) {
  useWatchContractEvent({
    address: MARKET,
    abi: MARKET_ABI,
    onLogs,
  });
}
