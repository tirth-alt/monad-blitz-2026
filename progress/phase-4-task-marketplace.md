# Phase 4 — TaskMarketplace.sol (tiered escrow + x402 instant settlement)

**Status:** ✅ Done
**File:** `contracts/contracts/TaskMarketplace.sol`
**Goal:** The hub contract. Posters fund tasks; the platform assigns them to agents; on
completion the contract pays the agent and bumps reputation. Implements the **tiered trust
model** (reputation decides escrow vs. instant settlement) and the **x402 instant-pay primitive**
for agent-to-agent delegation.

---

## 1. Conceptual overview (the "why")

This is where the three contracts come together and where the project's economic story lives.
Two big design decisions, both made deliberately:

### A) The neutral verifier (closes the escrow standoff)
Classic escrow has a standoff: if the **poster** releases funds, they can deny payment for good
work; if the **agent** releases, they can fake completion. ChainMind breaks this because the
**platform itself executes the task** (it runs the Claude call and produces a result hash). So a
third role — the **`verifier`** (the backend automation) — is the only party that can `assign`
and `complete` tasks. It is neither poster nor agent, so:

- The poster **cannot deny** a completed task (they don't hold the release key).
- The agent **cannot fake** completion (it doesn't hold it either).
- The on-chain `resultHash` is public proof the work happened.

This is what makes the pitch line literally true: *"no human touched the payment."*

### B) Reputation tiers (the pivot — reputation reduces friction)
Instead of "escrow for everyone," **reputation changes the settlement path**:

| Agent tier | Condition | Settlement |
|------------|-----------|------------|
| **Trusted** | `score >= reputationThreshold` | **Instant** — released immediately on completion, no dispute friction. Branded the "x402 fast lane." |
| **New / unproven** | `score < threshold` | **Escrow** — held with a **timeout-reclaim** so the poster can recover funds if the task is never done. |

Why this is better than removing escrow outright:
- **Solves cold-start.** New agents (rep 0) still get work via escrow, which is how they *earn*
  the reputation that later unlocks the fast lane. No chicken-and-egg.
- **Keeps the demo's strongest visual** (the contract auto-releasing escrowed MON).
- **Makes reputation a real economic primitive**, not a vanity number: *earn trust → spend it as
  lower-friction payments.*

> Honest engineering note: on a blockchain you can't pay from nothing, so the bounty is **always
> funded at post time** (this guarantees the live demo never fails on "payment didn't go
> through"). The tier therefore governs the **release semantics** (instant vs. escrow-with-reclaim
> and the dispute-friction story), not whether money exists. The genuinely escrow-free path is
> `payAgentInstant` for delegation (below), where a trusted recipient is paid with no lock at all.

### C) x402 on delegation
The user chose to take x402 seriously for **agent-to-agent delegation**. x402 (Coinbase's HTTP
402 standard) is a *pay-per-request* protocol: request → `402 Payment Required` → sign payment →
retry with `X-PAYMENT` → get the result. That maps perfectly onto one agent hiring another for a
subtask. It splits into two legs:
1. **HTTP handshake** (Person 3's backend) — authentic regardless of chain.
2. **On-chain settlement** — provided here by `payAgentInstant`: an **escrow-free** instant
   transfer to a **trusted** (reputation-gated) agent. That's the literal "legit agents don't need
   escrow, they get paid instantly" idea the user proposed.

---

## 2. Technical breakdown (the "how")

### Roles
- **`owner`** — admin (deployer). Sets the verifier and threshold.
- **`verifier`** — the backend oracle; the *only* address that can `assignTask` / `completeTask`.
  Defaults to the deployer if not specified, settable later via `setVerifier`.

### Dependencies (wired at construction)
The contract holds `immutable` references to the other two contracts via minimal interfaces:
```solidity
interface IReputationStore { function increment(address,uint256) external; function getScore(address) external view returns (uint256); }
interface IAgentRegistry   { function isRegistered(address) external view returns (bool); }
```
Constructor takes `(_registry, _reputation, _verifier, _reputationThreshold)`. After deploy, the
deploy script also calls `ReputationStore.setAuthorizedCaller(thisMarketplace)` so `increment`
will accept calls from here — the two-step wiring described in Phase 2.

### The `Task` struct & `Status` lifecycle
```
Open ──assignTask──▶ Assigned ──completeTask──▶ Completed
 │                       │
 │ cancelTask            │ reclaim (after deadline)
 ▼                       ▼
Cancelled              Reclaimed
```
Each task stores poster, agent, description, category, reward, timestamps, deadline, status,
`instantSettle` (locked in at assignment based on the agent's tier), and `resultHash`.

### Function-by-function

| Function | Caller | What it does |
|----------|--------|--------------|
| `postTask(description, category, deadlineSeconds)` **payable** | anyone | Funds the bounty with `msg.value`, creates an `Open` task, sets `deadline = now + deadlineSeconds`. Emits `TaskPosted`. |
| `assignTask(taskId, agent)` | verifier | Requires task `Open` and `agent` registered. Reads the agent's score; sets `instantSettle = score >= threshold`. → `Assigned`. Emits `TaskAssigned`. |
| `completeTask(taskId, resultHash)` | verifier | Requires `Assigned`. Sets `Completed` + stores `resultHash` (**effects first**), pays the agent (`call{value}`), then calls `reputation.increment`. `nonReentrant`. Emits `TaskCompleted` + `PaymentReleased`. |
| `cancelTask(taskId)` | poster | Only while `Open` (unassigned) → full refund → `Cancelled`. |
| `reclaim(taskId)` | poster | Only after `deadline`, while still `Open`/`Assigned` → refund → `Reclaimed`. The safety valve; can never touch a `Completed` task. |
| `payAgentInstant(toAgent, relatedTaskId)` **payable** | anyone | Escrow-free instant transfer to a **trusted** agent (reputation-gated). The x402 delegation settlement leg. Emits `InstantPayment`. |
| `setVerifier` / `setReputationThreshold` | owner | Admin knobs. |
| `getTask` / `getOpenTasks` / `getTasksByAgent` / `getAllTasks` | view | Board + profile data for the frontend. |

### Security choices
- **Checks-Effects-Interactions**: in `completeTask`/`cancelTask`/`reclaim` we update status
  *before* transferring value, so a malicious recipient can't re-enter into a still-`Assigned`
  task.
- **`nonReentrant` guard**: a tiny lock modifier wraps every function that sends MON — belt and
  suspenders on top of CEI.
- **`.call{value:}`** for transfers (the recommended pattern over `.transfer`, which can fail
  with gas-limited recipients).
- **Authorization** everywhere: `onlyVerifier` for assign/complete, poster checks for
  cancel/reclaim, registry membership checks for agents.

### Events → the live feed
`TaskPosted`, `TaskAssigned`, `TaskCompleted`, `PaymentReleased`, `TaskCancelled`,
`TaskReclaimed`, `InstantPayment`. Person 3's SSE feed subscribes to these to render the
real-time on-chain activity stream and the "reputation 42 → 43 / payment flash" moments.

---

## 3. Dependency / risk flag (x402 on Monad)

The literal Coinbase/Stripe x402 flow settles in a **stablecoin with EIP-3009**
(`transferWithAuthorization`, e.g. USDC) via a **facilitator**. On Monad testnet that
infrastructure may not exist. Our approach de-risks this:
- We settle the on-chain leg in **native MON** via `payAgentInstant` (no facilitator needed).
- The **HTTP 402 + `X-PAYMENT` handshake** (backend) is implemented authentically and is
  chain-independent.
- If a Monad test-USDC with EIP-3009 appears, the backend can swap the settlement token later
  without contract changes to the core flow.

---

## 4. Verification performed

```bash
cd contracts
npx hardhat compile
# → Compiled successfully (all 3 contracts, evm target: paris)
```

Full behavioral tests — escrow release, reputation bump, trusted vs. escrow path,
unauthorized-caller reverts, reclaim-after-deadline, instant pay to trusted/untrusted — come in
**Phase 5**.

---

## 5. What's next

**Phase 5 — Local end-to-end test:** spin up a Hardhat node and exercise the full flow
(register agents → wire authorizedCaller → post → assign → complete → assert payment + reputation;
plus the tiered + reclaim + instant-pay edge cases) before we spend real testnet MON.
