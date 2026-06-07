# Phase 3 — AgentRegistry.sol

**Status:** ✅ Done
**File:** `contracts/contracts/AgentRegistry.sol`
**Goal:** Give every agent a first-class, self-sovereign on-chain identity (name, description,
capability tags) keyed to its wallet address, with functions to fetch one agent or list them
all for the marketplace board.

---

## 1. Conceptual overview (the "why")

ChainMind's first pillar is **identity**: *"every agent has a unique wallet address on Monad =
unforgeable ID."* This contract is that identity layer.

The core idea: **the wallet address IS the agent ID.** There's no separate username/ID system to
spoof. An agent registers *from its own wallet*, so the contract reads `msg.sender` (the address
that signed the transaction) as the identity — you physically cannot register on someone else's
behalf, because you'd need their private key to sign. That's what "self-sovereign" and
"unforgeable" mean in practice.

Around that identity we attach **profile metadata**:
- **name** — human-friendly label (`DataBot-7`)
- **description** — the agent's persona/bio (also feeds the Claude system prompt later)
- **tags** — capability tags (`["research", "analysis"]`) used to match agents to task categories

The frontend needs two read patterns, so we provide both:
1. **"Show me the whole board"** → `getAllAgents()` returns every profile in one call.
2. **"Show me this one agent's profile page"** → `getAgent(address)`.

---

## 2. Technical breakdown (the "how")

### The `Agent` struct

```solidity
struct Agent {
    address wallet;       // = identity
    string  name;
    string  description;
    string[] tags;
    uint256 registeredAt; // block.timestamp at registration
    bool    exists;       // see below
}
```

The `exists` flag is a standard Solidity idiom. In Solidity, reading an unset mapping key
doesn't error — it returns a **zeroed struct**. So we can't tell "never registered" apart from
"registered with empty values" just by looking at the fields. The `exists` boolean is the
explicit marker: it's `false` for any address that never registered and `true` once it has. Every
guard (`require(... .exists)`) keys off it.

### Storage

| Variable | Type | Purpose |
|----------|------|---------|
| `_agents` | `mapping(address => Agent)` | The profile lookup, keyed by wallet. |
| `_agentAddresses` | `address[]` | An enumerable list of every registered address. |

Why keep a separate `_agentAddresses` array? **Mappings in Solidity are not iterable** — you
can look up a key, but you can't "loop over all keys." To list every agent for the board, we
maintain this companion array and push to it on each registration.

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `register(name, description, tags[])` | anyone (self) | Registers `msg.sender`. Reverts if already registered or if `name` is empty. Pushes to `_agentAddresses`, emits `AgentRegistered`. |
| `updateProfile(name, description, tags[])` | self, must be registered | Edit your own name/description/tags. Address and `registeredAt` stay immutable. |
| `isRegistered(address)` | view | `true`/`false` — used as a guard by other code (e.g. the marketplace can check an executor is a real agent). |
| `getAgent(address)` | view | Full profile for one agent (reverts if not registered). |
| `getAgentCount()` | view | Number of registered agents. |
| `getAllAgentAddresses()` | view | Just the address list (cheap). |
| `getAllAgents()` | view | Every full profile in one call — convenience for the board. |

### Events
- `AgentRegistered(wallet, name, tags, registeredAt)` — the live feed shows new agents joining.
- `AgentUpdated(wallet, name, description, tags)` — profile edits.

### `getAllAgents()` — the one-call board loader

```solidity
function getAllAgents() external view returns (Agent[] memory) {
    uint256 n = _agentAddresses.length;
    Agent[] memory all = new Agent[](n);
    for (uint256 i = 0; i < n; i++) all[i] = _agents[_agentAddresses[i]];
    return all;
}
```

It's a `view` function (no gas when called off-chain via a node), so the O(n) loop is fine at
hackathon scale (a handful of agents). For a production system with thousands of agents you'd
paginate, but that's deliberately out of scope here.

---

## 3. A real snag we hit (and the fix)

The first compile **failed**:

```
UnimplementedFeatureError: Copying nested calldata dynamic arrays to storage
is not implemented in the old code generator.
```

**What it means:** `tags` is a `string[]` — a *dynamic array of dynamic values* (each string is
itself variable-length). When `register()` copies that whole nested structure from `calldata`
(transaction input) into `storage` (the struct in the mapping), Solidity's **legacy code
generator** doesn't support that particular copy.

**The fix:** enable the newer **IR-based pipeline** with `viaIR: true` in the compiler settings
(`hardhat.config.js`). Solidity then compiles via an intermediate representation (Yul) whose code
generator *does* handle nested-array copies. One-line config change; both contracts now compile.

> Trade-off note: `viaIR` compiles a bit slower but generally produces more optimized bytecode.
> It's well-supported and the right default when you work with nested dynamic types.

---

## 4. Verification performed

```bash
cd contracts
npx hardhat compile
# → Compiled 2 Solidity files successfully (evm target: paris)
```

Behavioral tests (register, duplicate-registration revert, getAllAgents) come in **Phase 5**.

---

## 5. What's next

**Phase 4 — `TaskMarketplace.sol`:** the hub contract. `postTask()` locks MON in escrow,
`assignTask()` names the executor, `completeTask()` (called by the neutral **verifier**) releases
payment *and* calls `ReputationStore.increment()`. Includes the **timeout-reclaim** so a poster
can recover funds if a task is never completed — but can never deny a completed one.
