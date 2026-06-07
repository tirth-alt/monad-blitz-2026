# Phase 6 — Deploy to Monad Testnet + Export ABIs

**Status:** 🟡 Script ready & dry-run-verified — **live testnet deploy pending the funded wallet**
**Files:** `contracts/scripts/deploy.js` → outputs to `lib/contracts/`
**Goal:** Deploy all three contracts to Monad testnet, wire them, and hand the frontend
everything it needs (addresses + ABIs) in one folder.

---

## 1. Conceptual overview (the "why")

A deploy is more than "upload three contracts." For ChainMind it's a precise **sequence** that
must happen in order, plus a clean **handoff** to the frontend:

1. **Order matters.** `TaskMarketplace` needs the addresses of the other two at construction, so
   `ReputationStore` and `AgentRegistry` must deploy *first*.
2. **Wiring matters.** After the marketplace exists, we call
   `ReputationStore.setAuthorizedCaller(marketplace)` — otherwise `completeTask` would revert on
   every reputation bump (the Phase 2 two-step wiring). Forgetting this is the #1 way a fresh
   deploy "compiles and deploys but mysteriously fails at completion."
3. **Handoff matters.** The frontend talks to contracts through their **ABI** (the JSON
   description of functions/events) + **address**. We auto-export both so the frontend team never
   hand-copies an address or a stale ABI.

A single script does all three deterministically, so a redeploy is one command and never a
checklist someone can fumble.

---

## 2. Technical breakdown (the "how")

### `scripts/deploy.js`
Steps, in order:
1. Read the deployer signer; print address + balance; **abort if balance is 0** (clear error
   instead of a cryptic gas failure).
2. Deploy `ReputationStore`, then `AgentRegistry`.
3. Deploy `TaskMarketplace(registry, reputation, verifier, threshold)`.
4. `reputation.setAuthorizedCaller(marketplace)` and wait for the tx.
5. Export artifacts to `/lib/contracts/`.
6. On `monadTestnet`, print explorer links for each contract.

### Configurable via env (all optional)
| Env var | Default | Meaning |
|---------|---------|---------|
| `VERIFIER_ADDRESS` | deployer | The backend oracle allowed to assign/complete tasks. |
| `REPUTATION_THRESHOLD` | `1` | Score `>=` this ⇒ trusted (instant settlement). |

### What gets written to `/lib/contracts/`
| File | Contents |
|------|----------|
| `ReputationStore.json` / `AgentRegistry.json` / `TaskMarketplace.json` | Each contract's ABI. |
| `addresses.json` | `{ chainId, network, verifier, reputationThreshold, <3 addresses> }`. |
| `index.ts` | A TS barrel: `addresses`, `abis`, and a `CHAIN` config object (id, RPC, explorer, MON currency) — one import for the wagmi/viem layer. |

This `/lib/contracts/` folder is the **contract boundary** between the blockchain work and the
frontend (Phase 7 hooks + Person 2's components import from here).

---

## 3. Dry-run verification (done)

Ran the script against Hardhat's in-process chain to validate the full path without spending
testnet MON:

```bash
cd contracts
npx hardhat run scripts/deploy.js
# → deployed all 3, wired authorizedCaller ✓, wrote 5 files to /lib/contracts/
```

> ⚠️ The files currently in `/lib/contracts/` hold **local dry-run addresses (chainId 31337)**.
> They will be **overwritten** by the real `npm run deploy:monad`. The ABIs, however, are already
> the final ones (they only change if a contract's interface changes).

---

## 4. How to run the real deploy (the one manual step)

**Prerequisite:** a Monad testnet wallet funded with a little MON (see `progress/README.md`).

```bash
cd contracts
cp .env.example .env          # then edit .env:
#   PRIVATE_KEY=0x<your funded testnet key>
#   (optional) VERIFIER_ADDRESS=0x<backend wallet>   — defaults to deployer
#   (optional) REPUTATION_THRESHOLD=1

npm run deploy:monad
```

The script prints the three contract addresses + explorer links and regenerates
`/lib/contracts/` with the **real Monad addresses (chainId 10143)**. Hand those to the frontend
(or they're already importable from `lib/contracts`).

---

## 5. What's next

- **Phase 6b — Seed script** (`scripts/seed.js`): pre-register 3 demo agents and give them varied
  reputation by running real post→assign→complete cycles, so the board looks alive for the demo.
- **Phase 7 — wagmi hooks** (`useAgentRegistry.ts`, `useTaskMarketplace.ts`): the React
  integration layer that reads/writes these contracts and subscribes to events for the live feed.
