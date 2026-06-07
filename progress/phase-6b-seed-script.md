# Phase 6b — Demo Seed Script

**Status:** ✅ Done — verified end-to-end on a local node
**File:** `contracts/scripts/seed.js`
**Goal:** Make the marketplace look alive for the demo: 3 registered agents with varied,
*genuinely on-chain* reputation — built by running real post → assign → complete cycles, not
faked.

---

## 1. Conceptual overview (the "why")

An empty board is a bad demo. We want judges to open ChainMind and immediately see agents with
different reputations (a leaderboard, a trusted vs. escrow split). The honest way to do that —
consistent with the whole "everything is real on-chain" pitch — is to **earn** those scores the
same way a real agent would: by completing real tasks through the real contract. No setter
backdoor, no fake numbers.

The challenge: agents are **self-sovereign** (each registers from its own wallet) and reputation
only moves through completed tasks. So the seed script has to actually spin up agent wallets,
fund them, register them, and drive full task cycles. That's exactly what it does.

---

## 2. Technical breakdown (the "how")

### Inputs
Reads `lib/contracts/addresses.json` (written by `deploy.js`), so it must run **after a deploy on
the same network**. Requires the deployer to also be the marketplace **`verifier`** (the default),
because seeding calls `assignTask`/`completeTask`.

### The 3 demo agents
```js
DataBot-7      → 6 completions   (analysis, research)
ResearchBot-3  → 4 completions   (research, writing)
WriterAgent-12 → 2 completions   (writing)
```
Counts are modest on purpose (cheap + fast on testnet) while still producing a clear leaderboard
and a tier split.

### Per-agent flow
1. **Generate / reuse wallet.** Agent wallets are created once and persisted to
   `contracts/.seeded-agents.json` (gitignored), keyed by chainId, so re-runs reuse the same
   agents (stable addresses across demo runs).
2. **Gas top-up.** The deployer sends each agent a little MON (`0.02`) so it can pay for its own
   `register()` tx.
3. **Register** (idempotent — skipped if already registered).
4. **Build reputation.** Loop until the agent's score hits its target:
   `marketplace.postTask(tinyReward)` → parse the `TaskPosted` event for the new `taskId` →
   `assignTask(taskId, agent)` → `completeTask(taskId, resultHash)`. Each cycle is 3 real txs and
   bumps reputation by 1.
5. Print whether the agent is **trusted** (score ≥ threshold) or **escrow tier**.

Finally it prints a **leaderboard** sorted by score.

### Cost
Rewards are tiny (`0.001` MON each) and flow deployer → agent, so net MON cost is just gas + the
small bounties (which the agents keep). Total for the default 12 completions is well under
0.1 MON plus gas.

---

## 3. Verified run (local node)

```
• DataBot-7      reputation: 6  ✓ trusted (instant)
• ResearchBot-3  reputation: 4  ✓ trusted (instant)
• WriterAgent-12 reputation: 2  ✓ trusted (instant)

Leaderboard:
  1. DataBot-7 — 6
  2. ResearchBot-3 — 4
  3. WriterAgent-12 — 2
```

Ran against `npx hardhat node`: deploy → seed → all three registered, reputations built via real
on-chain cycles, leaderboard correct.

---

## 4. Demo tip — show BOTH tiers

The contracts deployed with `REPUTATION_THRESHOLD=1`, so every seeded agent is "trusted." To make
the **escrow vs. instant** distinction visible in the demo, deploy with a higher threshold:

```bash
REPUTATION_THRESHOLD=3 npm run deploy:monad && npm run seed:monad
```

Then DataBot-7 (6) and ResearchBot-3 (4) are **trusted/instant**, while WriterAgent-12 (2) is in
the **escrow tier** — a clean on-screen contrast between the two settlement paths.

---

## 5. What's next

**Phase 7 — wagmi hooks:** the React layer that reads/writes these contracts and streams events
to the live feed. (Done — see phase-7.)
