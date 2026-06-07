# Phase 2 — ReputationStore.sol

**Status:** ✅ Done
**File:** `contracts/contracts/ReputationStore.sol`
**Goal:** A tamper-proof, on-chain ledger of each agent's reputation (completed-task count)
and work history (the list of task IDs it completed).

---

## 1. Conceptual overview (the "why")

Reputation is the heart of ChainMind's pitch: *"agents earn reputation through work, and it's
immutable, portable, and owned by the agent."* For that claim to be true, two properties must
hold:

1. **It must be honest.** No one can hand themselves a high score. Reputation can *only* go up,
   and *only* as a side effect of genuinely completing + getting paid for a task.
2. **It must be readable by anyone.** The marketplace UI, the leaderboard, and judges should all
   be able to query an agent's score and history directly from the chain.

The way we guarantee #1 is **access control**. There is exactly one function that increases a
score — `increment()` — and it can only be called by **one specific address**: the
`TaskMarketplace` contract. So reputation can only change as part of the marketplace's
"task completed → payment released → reputation +1" flow. A random user calling the contract
directly gets rejected.

> Why is `ReputationStore` a *separate* contract instead of just a mapping inside
> `TaskMarketplace`? Two reasons: (a) **portability** — reputation lives in its own contract, so
> future versions of the marketplace (or other contracts) could be authorized to read/write it
> without migrating data; (b) **clarity** — it matches the PRD's three-contract architecture and
> keeps each contract single-purpose.

---

## 2. Technical breakdown (the "how")

### State variables

| Variable | Type | Purpose |
|----------|------|---------|
| `owner` | `address` | The deployer. The only one who can set `authorizedCaller`. |
| `authorizedCaller` | `address` | The TaskMarketplace — the **only** address allowed to call `increment()`. |
| `_scores` | `mapping(address => uint256)` | agent → reputation score (completed-task count). |
| `_history` | `mapping(address => uint256[])` | agent → list of completed task IDs. |

`_scores` and `_history` are `private` so external code goes through our getter functions —
that keeps the public interface explicit and clean.

### The authorization pattern (the important part)

```solidity
address public owner;            // set once, in the constructor, to the deployer
address public authorizedCaller; // set later, to the marketplace

modifier onlyOwner()      { require(msg.sender == owner, ...); _; }
modifier onlyAuthorized() { require(msg.sender == authorizedCaller, ...); _; }
```

- `constructor()` records the deployer as `owner`.
- `setAuthorizedCaller(marketplace)` — **owner-only**, called once after we deploy the
  marketplace in Phase 6, to point this contract at it.
- `increment(...)` — **onlyAuthorized**, so only the marketplace can ever raise a score.

This is a deliberate two-step wiring: at deploy time the marketplace doesn't exist yet, so we
can't set its address in the constructor. We deploy ReputationStore first, deploy the
marketplace (passing it the ReputationStore address), then call `setAuthorizedCaller` to close
the loop. (The deploy script in Phase 6 does all three automatically.)

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `setAuthorizedCaller(address)` | owner | Wire the marketplace as the increment authority. Rejects the zero address. |
| `increment(address agent, uint256 taskId)` | authorized | `+1` to the agent's score and append `taskId` to its history. Emits `ReputationIncremented`. |
| `getScore(address)` | view (public) | Returns the agent's current score. |
| `getHistory(address)` | view (public) | Returns the full array of completed task IDs. |
| `getHistoryCount(address)` | view (public) | Returns just the count — cheaper than fetching the whole array (e.g. for a card that only shows a number). |

### Events

- `ReputationIncremented(agent, taskId, newScore)` — emitted on every increment. The frontend's
  **live feed** subscribes to this to animate the reputation counter (PRD: "Reputation: 42 → 43").
- `AuthorizedCallerUpdated(previous, current)` — audit trail for the wiring step.

> **Events vs. storage:** events are a cheap, log-only way to *broadcast* that something
> happened. They can't be read by other contracts, but off-chain listeners (our SSE live feed)
> can subscribe to them in real time. We emit on every state change so the UI stays live without
> polling.

### Solidity safety notes
- `pragma ^0.8.24` → built-in overflow checks, so `_scores[agent] += 1` can never wrap around.
- Zero-address guards on both `setAuthorizedCaller` and `increment` prevent obvious mistakes.
- Append-only by design: there is **no** decrement or reset function. Reputation only grows.

---

## 3. Verification performed

```bash
cd contracts
npx hardhat compile
# → Compiled 1 Solidity file successfully (evm target: paris)
```

Full behavioral tests (increment math, history append, unauthorized-caller rejection) come in
**Phase 5**, once all three contracts exist and can be tested together end-to-end.

---

## 4. What's next

**Phase 3 — `AgentRegistry.sol`:** gives each agent an on-chain identity (name, description,
capability tags) keyed to its wallet address, plus functions to fetch one agent or list them all
for the marketplace board.
