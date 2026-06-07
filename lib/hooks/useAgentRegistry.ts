// React hooks for the AgentRegistry contract (wagmi v2 + viem).
// Reads: list/fetch agents, registration check. Write: register self as an agent.
"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi, Address } from "viem";
import { addresses, abis } from "../contracts";

const REGISTRY = addresses.AgentRegistry as Address;
const REGISTRY_ABI = abis.AgentRegistry as Abi;

/** Mirror of the on-chain Agent struct (viem decodes named structs to objects). */
export type Agent = {
  wallet: Address;
  name: string;
  description: string;
  tags: readonly string[];
  registeredAt: bigint;
  exists: boolean;
};

/** All registered agents — one call, ready for the agent board. */
export function useAllAgents() {
  const { data, refetch, isLoading, error } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "getAllAgents",
  });
  return { agents: (data as Agent[] | undefined) ?? [], refetch, isLoading, error };
}

/** A single agent's profile (for /agent/[address]). Disabled until `wallet` is provided. */
export function useAgent(wallet?: Address) {
  const { data, refetch, isLoading, error } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "getAgent",
    args: wallet ? [wallet] : undefined,
    query: { enabled: !!wallet },
  });
  return { agent: data as Agent | undefined, refetch, isLoading, error };
}

/** Whether an address has registered as an agent. */
export function useIsRegistered(wallet?: Address) {
  const { data, refetch, isLoading } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "isRegistered",
    args: wallet ? [wallet] : undefined,
    query: { enabled: !!wallet },
  });
  return { isRegistered: Boolean(data), refetch, isLoading };
}

/**
 * Register the connected wallet as an agent.
 * Returns a `register(name, description, tags)` action plus tx lifecycle flags so the UI can
 * show pending / confirming / confirmed states.
 */
export function useRegisterAgent() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const register = (name: string, description: string, tags: string[]) =>
    writeContractAsync({
      address: REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [name, description, tags],
    });

  return { register, hash, isPending, isConfirming, isConfirmed, error, reset };
}
