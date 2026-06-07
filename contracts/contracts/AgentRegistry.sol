// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice On-chain identity layer for ChainMind agents. Each agent is keyed to its own
 *         wallet address — the address IS the unforgeable agent ID. An agent registers
 *         itself once with a name, description, and capability tags.
 *
 * @dev One agent per address. Identity is self-sovereign: an agent registers from its own
 *      wallet (`msg.sender`), so no one can register on someone else's behalf.
 */
contract AgentRegistry {
    struct Agent {
        address wallet; // the agent's wallet = its identity
        string name; // display name, e.g. "DataBot-7"
        string description; // short bio / persona
        string[] tags; // capability tags, e.g. ["research", "analysis"]
        uint256 registeredAt; // block timestamp of registration
        bool exists; // distinguishes a registered agent from a zeroed struct
    }

    /// @notice agent wallet => profile.
    mapping(address => Agent) private _agents;

    /// @notice Enumerable list of all registered agent addresses (for the marketplace board).
    address[] private _agentAddresses;

    event AgentRegistered(address indexed wallet, string name, string[] tags, uint256 registeredAt);
    event AgentUpdated(address indexed wallet, string name, string description, string[] tags);

    /**
     * @notice Register the caller (`msg.sender`) as an agent.
     * @dev Reverts if the caller is already registered. Identity is the wallet address.
     * @param name        Display name.
     * @param description Short bio / persona.
     * @param tags        Capability tags.
     */
    function register(
        string calldata name,
        string calldata description,
        string[] calldata tags
    ) external {
        require(!_agents[msg.sender].exists, "AgentRegistry: already registered");
        require(bytes(name).length > 0, "AgentRegistry: name required");

        _agents[msg.sender] = Agent({
            wallet: msg.sender,
            name: name,
            description: description,
            tags: tags,
            registeredAt: block.timestamp,
            exists: true
        });
        _agentAddresses.push(msg.sender);

        emit AgentRegistered(msg.sender, name, tags, block.timestamp);
    }

    /**
     * @notice Update the caller's own profile (name/description/tags). Identity (address) and
     *         registration time are immutable.
     */
    function updateProfile(
        string calldata name,
        string calldata description,
        string[] calldata tags
    ) external {
        require(_agents[msg.sender].exists, "AgentRegistry: not registered");
        require(bytes(name).length > 0, "AgentRegistry: name required");

        Agent storage a = _agents[msg.sender];
        a.name = name;
        a.description = description;
        a.tags = tags;

        emit AgentUpdated(msg.sender, name, description, tags);
    }

    /// @notice Whether an address has registered as an agent.
    function isRegistered(address wallet) external view returns (bool) {
        return _agents[wallet].exists;
    }

    /// @notice Fetch a single agent's full profile.
    function getAgent(address wallet) external view returns (Agent memory) {
        require(_agents[wallet].exists, "AgentRegistry: not registered");
        return _agents[wallet];
    }

    /// @notice Total number of registered agents.
    function getAgentCount() external view returns (uint256) {
        return _agentAddresses.length;
    }

    /// @notice All registered agent addresses (cheap; resolve each via getAgent if needed).
    function getAllAgentAddresses() external view returns (address[] memory) {
        return _agentAddresses;
    }

    /**
     * @notice All registered agents as full profile structs, in one call.
     * @dev Convenience for the marketplace board so the frontend can populate every agent card
     *      with a single read. Fine for a hackathon-scale agent count.
     */
    function getAllAgents() external view returns (Agent[] memory) {
        uint256 n = _agentAddresses.length;
        Agent[] memory all = new Agent[](n);
        for (uint256 i = 0; i < n; i++) {
            all[i] = _agents[_agentAddresses[i]];
        }
        return all;
    }
}
