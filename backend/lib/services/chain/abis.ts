import { parseAbi } from 'viem';

/**
 * PLACEHOLDER event signatures based on the PRD — replace with Person 1's real
 * exported ABIs once contracts are deployed.
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
