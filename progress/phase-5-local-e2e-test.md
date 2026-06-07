# Phase 5 — Local End-to-End Test

**Status:** ✅ Done — **16 passing**
**File:** `contracts/test/chainmind.test.js`
**Goal:** Prove the full system works on a local Hardhat node — the complete lifecycle plus all
the edge cases and access-control rules — *before* spending real testnet MON in Phase 6.

---

## 1. Conceptual overview (the "why")

A smart contract that compiles is not a smart contract that *works*. Compilation only checks
types and syntax; it says nothing about whether the **money moves correctly** or whether the
**access control actually holds**. And on-chain, mistakes are expensive and irreversible.

So before touching the testnet we run the entire system on Hardhat's **in-memory blockchain** —
instant, free, and with helpers to fast-forward time (to test the reclaim deadline) and assert
exact balance changes (to prove payments). This is the dress rehearsal.

The tests mirror the **real deploy + wiring sequence** exactly, so passing here gives high
confidence the testnet deploy will behave the same.

---

## 2. Technical breakdown (the "how")

### The fixture (`deployFixture`)
Sets up a realistic world once and reuses it via `loadFixture` (which snapshots the chain state
and resets to it between tests — fast and isolated):

1. Deploy `ReputationStore`.
2. Deploy `AgentRegistry`.
3. Deploy `TaskMarketplace(registry, reputation, verifier, threshold=1)`.
4. **Wire** `reputation.setAuthorizedCaller(marketplace)` — the Phase 2 two-step wiring.
5. Register two agents (`DataBot-7`, `WriterAgent-12`) from their own wallets.

Distinct signers play distinct roles — `owner`, `verifier`, `poster`, `agentA`, `agentB`,
`outsider` — so role-based access control is genuinely exercised, not faked from one account.

### What's covered (16 tests)

**AgentRegistry**
- ✔ register → readable via `getAgent` / `getAllAgents`; count correct
- ✔ duplicate registration reverts
- ✔ empty name reverts

**ReputationStore (access control)**
- ✔ `increment` from a non-authorized address reverts ("not authorized")
- ✔ `setAuthorizedCaller` from a non-owner reverts ("not owner")

**TaskMarketplace — core flow**
- ✔ `postTask` locks the reward in the contract (asserts contract balance == reward) + emits `TaskPosted`
- ✔ zero-reward post reverts
- ✔ non-verifier `assignTask` reverts
- ✔ **escrow path**: new agent (rep 0 < threshold) → `instantSettle=false`; `completeTask`
  **pays the agent the exact reward** (`changeEtherBalance`) **and** bumps reputation to 1 with
  history `[1]`
- ✔ **trusted path**: after one completion the agent's score hits the threshold, so the next
  assignment flags `instantSettle=true`
- ✔ assigning an unregistered agent reverts

**TaskMarketplace — cancel & reclaim**
- ✔ poster cancels an open task → exact refund, status `Cancelled`
- ✔ reclaim **reverts before deadline**, then **succeeds after** `time.increase(1 day)` → exact
  refund, status `Reclaimed`
- ✔ a **completed** task **cannot** be reclaimed (the anti-"poster denies payment" guarantee)

**TaskMarketplace — x402 instant delegation**
- ✔ `payAgentInstant` to a **trusted** agent succeeds + emits `InstantPayment`
- ✔ `payAgentInstant` to an **untrusted** (rep 0) agent reverts ("agent not trusted")

### Techniques used
- **`changeEtherBalance`** — asserts the *exact* MON delta on payout/refund, so "money moved
  correctly" is verified, not assumed.
- **`time.increase(DAY + 1)`** — fast-forwards block time to test the reclaim deadline without
  waiting.
- **`.emit(...).withArgs(...)`** — verifies events fire with the right payload (the live feed
  depends on these).
- **`anyValue`** matcher — for the `deadline` arg in `TaskPosted`, which is a block-timestamp
  derivative we don't want to pin to an exact number.

---

## 3. Result

```bash
cd contracts
npx hardhat test
# → 16 passing (910ms)
```

The full lifecycle — register → wire → post → assign → complete → pay + reputation bump — works,
along with both settlement tiers, cancel, reclaim-after-deadline, the can't-deny-completed
guarantee, and instant delegation pay with its trust gate. Access control holds on every
restricted function.

---

## 4. What's next

**Phase 6 — Deploy to Monad testnet + export ABIs.** Needs the funded testnet wallet
(`PRIVATE_KEY` in `contracts/.env`). The deploy script will: deploy all three contracts, run the
`setAuthorizedCaller` wiring, write addresses + ABIs to `/lib/contracts/` for the frontend, and
print explorer links.
