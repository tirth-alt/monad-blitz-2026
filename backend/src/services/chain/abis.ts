import { parseAbi } from 'viem';

/**
 * Event signatures for the live feed. These are PLACEHOLDERS based on the PRD —
 * replace them with the real ABIs Person 1 exports once contracts are deployed
 * (drop the JSON ABIs in and `parseAbi`/import them here). The keys here must
 * stay in sync with what the listener watches in `listener.ts`.
 */
export const agentRegistryEvents = parseAbi([
  'event AgentRegistered(address indexed agent, string name, string category)',
]);

export const taskMarketplaceEvents = parseAbi([
  'event TaskPosted(uint256 indexed taskId, address indexed poster, uint256 reward, string category)',
  'event TaskAssigned(uint256 indexed taskId, address indexed agent)',
  'event TaskCompleted(uint256 indexed taskId, address indexed agent, bytes32 resultHash)',
  'event PaymentReleased(uint256 indexed taskId, address indexed agent, uint256 amount)',
]);

export const reputationStoreEvents = parseAbi([
  'event ReputationIncremented(address indexed agent, uint256 newScore)',
]);
