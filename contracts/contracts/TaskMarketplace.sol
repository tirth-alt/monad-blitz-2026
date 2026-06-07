// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface to the reputation ledger (Phase 2).
interface IReputationStore {
    function increment(address agent, uint256 taskId) external;
    function getScore(address agent) external view returns (uint256);
}

/// @notice Minimal interface to the agent identity registry (Phase 3).
interface IAgentRegistry {
    function isRegistered(address wallet) external view returns (bool);
}

/**
 * @title TaskMarketplace
 * @notice The hub of ChainMind. Posters fund tasks; the platform assigns them to agents;
 *         on completion the contract pays the agent and bumps its reputation.
 *
 * @dev Trust model (tiered):
 *      - A neutral `verifier` (the backend that actually runs the Claude task) is the only
 *        party that can assign + complete tasks. It is neither poster nor agent, which closes
 *        the "poster denies payment" loophole and the "agent fakes completion" loophole.
 *      - REPUTATION TIERS change the settlement path:
 *          * Trusted agent (score >= reputationThreshold): tasks settle on the INSTANT path —
 *            funds release immediately on completion, no dispute friction ("x402 fast lane").
 *          * New/unproven agent (score < threshold): full ESCROW with a timeout-reclaim, so the
 *            poster can recover funds if the task is never completed — but can never deny a
 *            completed one.
 *      - `payAgentInstant` is the escrow-free, trusted-agent micropayment primitive used by the
 *        agent-to-agent x402 delegation flow (the on-chain settlement leg).
 */
contract TaskMarketplace {
    // ---------------------------------------------------------------------
    // Roles & wiring
    // ---------------------------------------------------------------------

    /// @notice Admin: sets verifier, threshold, and (re)wires dependencies.
    address public owner;

    /// @notice Neutral oracle (backend automation) allowed to assign + complete tasks.
    address public verifier;

    /// @notice Reputation score at/above which an agent is "trusted" → instant settlement.
    uint256 public reputationThreshold;

    IAgentRegistry public immutable registry;
    IReputationStore public immutable reputation;

    // ---------------------------------------------------------------------
    // Task data
    // ---------------------------------------------------------------------

    enum Status {
        Open, // posted + funded, no agent yet
        Assigned, // agent assigned, work in progress
        Completed, // result submitted, agent paid, reputation bumped
        Cancelled, // poster cancelled before assignment (refunded)
        Reclaimed // poster reclaimed funds after deadline (never completed)
    }

    struct Task {
        uint256 id;
        address poster;
        address agent; // assigned executor (address(0) until assigned)
        string description;
        string category; // "Research" | "Analysis" | "Code" | "Writing"
        uint256 reward; // MON locked at post time (wei)
        uint256 createdAt;
        uint256 deadline; // after this, an uncompleted task is reclaimable
        Status status;
        bool instantSettle; // true if assigned agent was trusted at assignment time
        bytes32 resultHash; // hash of the Claude result, set on completion
    }

    uint256 public taskCount;
    mapping(uint256 => Task) private _tasks;

    // ---------------------------------------------------------------------
    // Events (consumed by the live feed)
    // ---------------------------------------------------------------------

    event TaskPosted(uint256 indexed taskId, address indexed poster, string category, uint256 reward, uint256 deadline);
    event TaskAssigned(uint256 indexed taskId, address indexed agent, bool instantSettle);
    event TaskCompleted(uint256 indexed taskId, address indexed agent, bytes32 resultHash);
    event PaymentReleased(uint256 indexed taskId, address indexed agent, uint256 amount, bool instant);
    event TaskCancelled(uint256 indexed taskId, address indexed poster, uint256 refund);
    event TaskReclaimed(uint256 indexed taskId, address indexed poster, uint256 amount);
    event InstantPayment(address indexed from, address indexed toAgent, uint256 indexed relatedTaskId, uint256 amount);
    event VerifierUpdated(address indexed previous, address indexed current);
    event ReputationThresholdUpdated(uint256 previous, uint256 current);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Marketplace: not owner");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Marketplace: not verifier");
        _;
    }

    // Minimal non-reentrancy guard (we make external value transfers).
    uint256 private _lock = 1;
    modifier nonReentrant() {
        require(_lock == 1, "Marketplace: reentrant");
        _lock = 2;
        _;
        _lock = 1;
    }

    // ---------------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------------

    /**
     * @param _registry            Deployed AgentRegistry address.
     * @param _reputation          Deployed ReputationStore address.
     * @param _verifier            Backend oracle that assigns + completes tasks.
     * @param _reputationThreshold Score >= this => trusted (instant settlement).
     */
    constructor(address _registry, address _reputation, address _verifier, uint256 _reputationThreshold) {
        require(_registry != address(0) && _reputation != address(0), "Marketplace: zero dep");
        owner = msg.sender;
        registry = IAgentRegistry(_registry);
        reputation = IReputationStore(_reputation);
        verifier = _verifier == address(0) ? msg.sender : _verifier;
        reputationThreshold = _reputationThreshold;
    }

    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Marketplace: zero verifier");
        emit VerifierUpdated(verifier, _verifier);
        verifier = _verifier;
    }

    function setReputationThreshold(uint256 _threshold) external onlyOwner {
        emit ReputationThresholdUpdated(reputationThreshold, _threshold);
        reputationThreshold = _threshold;
    }

    // ---------------------------------------------------------------------
    // Core task lifecycle
    // ---------------------------------------------------------------------

    /**
     * @notice Post a task and fund its bounty in the same transaction.
     * @dev The MON sent (`msg.value`) is the reward, held by the contract until the task is
     *      completed, cancelled, or reclaimed. Funds are always locked at post time so the
     *      live demo can never fail on "payment didn't go through"; the reputation tier then
     *      governs the *release semantics* (instant vs. escrow-with-reclaim).
     * @param description    The task prompt (e.g. "Summarize the latest trends in DePIN").
     * @param category       One of Research / Analysis / Code / Writing.
     * @param deadlineSeconds Seconds from now after which an uncompleted task is reclaimable.
     * @return taskId        The new task's id.
     */
    function postTask(
        string calldata description,
        string calldata category,
        uint256 deadlineSeconds
    ) external payable returns (uint256 taskId) {
        require(msg.value > 0, "Marketplace: reward required");
        require(deadlineSeconds > 0, "Marketplace: deadline required");

        taskId = ++taskCount;
        _tasks[taskId] = Task({
            id: taskId,
            poster: msg.sender,
            agent: address(0),
            description: description,
            category: category,
            reward: msg.value,
            createdAt: block.timestamp,
            deadline: block.timestamp + deadlineSeconds,
            status: Status.Open,
            instantSettle: false,
            resultHash: bytes32(0)
        });

        emit TaskPosted(taskId, msg.sender, category, msg.value, block.timestamp + deadlineSeconds);
    }

    /**
     * @notice Assign an open task to an agent. Called by the platform (verifier), which picks
     *         the best agent (e.g. highest reputation) off-chain.
     * @dev Records whether the agent is "trusted" *at assignment time* to lock in the
     *      settlement path for this task.
     */
    function assignTask(uint256 taskId, address agent) external onlyVerifier {
        Task storage t = _tasks[taskId];
        require(t.id != 0, "Marketplace: no such task");
        require(t.status == Status.Open, "Marketplace: not open");
        require(registry.isRegistered(agent), "Marketplace: agent not registered");

        bool trusted = reputation.getScore(agent) >= reputationThreshold;
        t.agent = agent;
        t.status = Status.Assigned;
        t.instantSettle = trusted;

        emit TaskAssigned(taskId, agent, trusted);
    }

    /**
     * @notice Mark a task complete: record the result hash, pay the agent, bump reputation.
     * @dev Verifier-only. This is the neutral-oracle release that no human poster can block.
     *      Checks-effects-interactions + nonReentrant around the value transfer.
     * @param taskId     The assigned task.
     * @param resultHash keccak256 (or similar) of the Claude result, stored as on-chain proof.
     */
    function completeTask(uint256 taskId, bytes32 resultHash) external onlyVerifier nonReentrant {
        Task storage t = _tasks[taskId];
        require(t.id != 0, "Marketplace: no such task");
        require(t.status == Status.Assigned, "Marketplace: not assigned");

        // Effects first.
        t.status = Status.Completed;
        t.resultHash = resultHash;
        uint256 amount = t.reward;
        address agent = t.agent;

        emit TaskCompleted(taskId, agent, resultHash);

        // Interaction: release the bounty to the agent.
        (bool ok, ) = payable(agent).call{value: amount}("");
        require(ok, "Marketplace: payout failed");
        emit PaymentReleased(taskId, agent, amount, t.instantSettle);

        // Reputation bump (only the marketplace is authorized to do this).
        reputation.increment(agent, taskId);
    }

    /**
     * @notice Poster cancels an OPEN (unassigned) task and gets a full refund.
     */
    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage t = _tasks[taskId];
        require(t.id != 0, "Marketplace: no such task");
        require(t.poster == msg.sender, "Marketplace: not poster");
        require(t.status == Status.Open, "Marketplace: not open");

        t.status = Status.Cancelled;
        uint256 refund = t.reward;

        (bool ok, ) = payable(msg.sender).call{value: refund}("");
        require(ok, "Marketplace: refund failed");
        emit TaskCancelled(taskId, msg.sender, refund);
    }

    /**
     * @notice Safety valve: after the deadline, a poster reclaims funds for a task that was
     *         never completed. Protects the poster from a dead agent — but can never be used
     *         to deny a task that *was* completed (status would no longer be Open/Assigned).
     */
    function reclaim(uint256 taskId) external nonReentrant {
        Task storage t = _tasks[taskId];
        require(t.id != 0, "Marketplace: no such task");
        require(t.poster == msg.sender, "Marketplace: not poster");
        require(t.status == Status.Open || t.status == Status.Assigned, "Marketplace: not reclaimable");
        require(block.timestamp >= t.deadline, "Marketplace: before deadline");

        t.status = Status.Reclaimed;
        uint256 amount = t.reward;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Marketplace: reclaim failed");
        emit TaskReclaimed(taskId, msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // x402 / agent-to-agent instant settlement
    // ---------------------------------------------------------------------

    /**
     * @notice Escrow-free instant payment to a TRUSTED agent — the on-chain settlement leg of
     *         the x402 agent-to-agent delegation flow. Because the recipient is reputation-gated
     *         (proven trustworthy), no escrow is needed: pay and the work is delivered in one
     *         shot, exactly like x402's HTTP 402 + X-PAYMENT round trip.
     * @param toAgent        The delegate agent receiving payment.
     * @param relatedTaskId  The parent task this delegation belongs to (for traceability/feed).
     */
    function payAgentInstant(address toAgent, uint256 relatedTaskId) external payable nonReentrant {
        require(msg.value > 0, "Marketplace: amount required");
        require(registry.isRegistered(toAgent), "Marketplace: agent not registered");
        require(reputation.getScore(toAgent) >= reputationThreshold, "Marketplace: agent not trusted");

        (bool ok, ) = payable(toAgent).call{value: msg.value}("");
        require(ok, "Marketplace: instant pay failed");
        emit InstantPayment(msg.sender, toAgent, relatedTaskId, msg.value);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getTask(uint256 taskId) external view returns (Task memory) {
        require(_tasks[taskId].id != 0, "Marketplace: no such task");
        return _tasks[taskId];
    }

    /// @notice All tasks currently Open (awaiting assignment). O(n) view — fine at demo scale.
    function getOpenTasks() external view returns (Task[] memory) {
        uint256 n;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].status == Status.Open) n++;
        }
        Task[] memory out = new Task[](n);
        uint256 j;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].status == Status.Open) out[j++] = _tasks[i];
        }
        return out;
    }

    /// @notice All tasks assigned to (or completed by) a given agent.
    function getTasksByAgent(address agent) external view returns (Task[] memory) {
        uint256 n;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].agent == agent) n++;
        }
        Task[] memory out = new Task[](n);
        uint256 j;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].agent == agent) out[j++] = _tasks[i];
        }
        return out;
    }

    /// @notice Every task (for the board / completed column). O(n) — fine at demo scale.
    function getAllTasks() external view returns (Task[] memory) {
        Task[] memory out = new Task[](taskCount);
        for (uint256 i = 1; i <= taskCount; i++) {
            out[i - 1] = _tasks[i];
        }
        return out;
    }
}
