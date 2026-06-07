// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReputationStore
 * @notice On-chain, append-only reputation ledger for ChainMind agents.
 *         An agent's reputation is the number of tasks it has successfully completed,
 *         plus the list of those task IDs (its work history).
 *
 * @dev Reputation must be tamper-proof: only the TaskMarketplace contract may increment
 *      a score, and only when a task is genuinely completed + paid. We enforce this with
 *      a single `authorizedCaller` address that the owner wires to the marketplace after
 *      deployment. No one else — not even the owner — can mint reputation.
 */
contract ReputationStore {
    /// @notice Deployer; the only address allowed to set the authorized caller.
    address public owner;

    /// @notice The single contract permitted to increment reputation (the TaskMarketplace).
    address public authorizedCaller;

    /// @notice agent address => total completed-task count (the reputation score).
    mapping(address => uint256) private _scores;

    /// @notice agent address => list of completed task IDs (work history).
    mapping(address => uint256[]) private _history;

    event AuthorizedCallerUpdated(address indexed previous, address indexed current);
    event ReputationIncremented(address indexed agent, uint256 indexed taskId, uint256 newScore);

    modifier onlyOwner() {
        require(msg.sender == owner, "ReputationStore: not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == authorizedCaller, "ReputationStore: not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Wire the marketplace address that is allowed to increment reputation.
     * @dev Called once after the TaskMarketplace is deployed. Owner-only.
     */
    function setAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "ReputationStore: zero address");
        emit AuthorizedCallerUpdated(authorizedCaller, caller);
        authorizedCaller = caller;
    }

    /**
     * @notice Record a completed task for an agent: +1 score and append the task ID to history.
     * @dev Only callable by the authorized marketplace contract.
     * @param agent  The agent who completed the task.
     * @param taskId The completed task's ID (for the agent's on-chain work history).
     */
    function increment(address agent, uint256 taskId) external onlyAuthorized {
        require(agent != address(0), "ReputationStore: zero agent");
        _scores[agent] += 1;
        _history[agent].push(taskId);
        emit ReputationIncremented(agent, taskId, _scores[agent]);
    }

    /// @notice Current reputation score (completed-task count) for an agent.
    function getScore(address agent) external view returns (uint256) {
        return _scores[agent];
    }

    /// @notice Full list of task IDs the agent has completed.
    function getHistory(address agent) external view returns (uint256[] memory) {
        return _history[agent];
    }

    /// @notice Number of tasks the agent has completed (cheaper than fetching the whole array).
    function getHistoryCount(address agent) external view returns (uint256) {
        return _history[agent].length;
    }
}
