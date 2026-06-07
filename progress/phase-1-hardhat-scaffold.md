# Phase 1 — Hardhat Scaffold

**Status:** ✅ Done
**Goal:** Stand up an isolated smart-contract development environment so we can write,
compile, test, and deploy Solidity to Monad testnet — without interfering with the
Next.js frontend.

---

## 1. Conceptual overview (the "why")

Before we can write a single contract, we need a **development harness**. Hardhat is the
tool that does four jobs for us:

1. **Compiles** Solidity (`.sol`) into EVM bytecode + ABI (the JSON interface the frontend uses).
2. **Runs a local blockchain** (an in-memory Ethereum/EVM node) so we can test instantly and
   for free before touching the real testnet.
3. **Deploys** compiled contracts to any network (local or Monad testnet).
4. **Verifies** source code on the block explorer so the contracts are publicly readable.

### Why a separate `/contracts` project?
The repo will eventually hold a Next.js app at the root. Hardhat and Next.js have **conflicting
dependency trees** (different versions of overlapping packages, different build tooling). Mixing
them in one `package.json` is a common source of "works on my machine" breakage in hackathons.

So we isolate Hardhat in its own folder with its own `package.json`. The only thing the frontend
needs from us is the **ABI + deployed address** of each contract — and we'll export those to
`/lib/contracts/` at the repo root in Phase 6. Clean boundary, no dependency fights.

```
ChainMind/
├── contracts/          ← self-contained Hardhat project (this phase)
│   ├── package.json
│   ├── hardhat.config.js
│   ├── .env.example
│   └── .gitignore
├── lib/contracts/      ← ABIs + addresses exported here later (Phase 6) for the frontend
└── progress/           ← these docs
```

---

## 2. Technical breakdown (the "how")

### `package.json`
Declares dependencies and convenience scripts.

- **`hardhat` ^2.22** — the framework. (Hardhat 2.x, the stable line.)
- **`@nomicfoundation/hardhat-toolbox`** — a bundle that pulls in everything we need in one
  package: `ethers.js` (to talk to contracts from JS), the testing stack (Mocha + Chai +
  matchers), gas reporting, and the explorer-verification plugin. Saves installing ~8 packages
  individually.
- **`dotenv`** — loads secrets (the deployer private key) from a `.env` file into
  `process.env` so they never get hard-coded into source.

Scripts (run with `npm run <name>` inside `/contracts`):

| Script | What it does |
|--------|--------------|
| `compile` | Compile all contracts → produces `artifacts/` (bytecode + ABI) |
| `test` | Run the test suite against the in-memory Hardhat node |
| `node` | Start a local blockchain on `http://127.0.0.1:8545` |
| `deploy:local` | Deploy to the local node |
| `deploy:monad` | Deploy to Monad testnet |
| `seed:monad` | Run the demo-seed script (pre-register mock agents) on Monad |

### `hardhat.config.js`
The central config file. Key sections:

- **`solidity`** — compiler version `0.8.24` with the optimizer enabled (`runs: 200`). 0.8.x
  has built-in overflow/underflow protection, so we don't need SafeMath. The optimizer reduces
  deployed bytecode size and gas cost.
- **`networks`**:
  - `hardhat` — the default in-process test chain (auto-funded accounts, instant blocks).
  - `localhost` — connects to a standalone `npx hardhat node` at port 8545.
  - `monadTestnet` — the real target: RPC `https://testnet-rpc.monad.xyz`, `chainId: 10143`.
    The deployer account is read from `PRIVATE_KEY` in `.env`. If no key is set yet, the
    accounts array is empty (so the config still loads without a key — handy for local-only work).
- **`etherscan` / `customChains`** — tells Hardhat how to verify contract source on Monad's
  explorer (`testnet.monadexplorer.com`). Verification makes the contract human-readable on the
  explorer, which is great for the demo ("here's the real, open code running on-chain").

### `.env.example`
A committed *template* showing which env vars are needed (`PRIVATE_KEY`, optional `MONAD_RPC_URL`).
The actual `.env` (with the real key) is **gitignored** and created locally only.

### `.gitignore`
Keeps generated/secret files out of version control: `node_modules/`, `.env`, `cache/`,
`artifacts/`, `typechain-types/`, coverage output.

---

## 3. Verification performed

```bash
cd contracts
npm install        # → added 594 packages
npx hardhat compile  # → "Nothing to compile" (no contracts yet) — confirms Hardhat runs
```

The clean compile run confirms the toolchain is correctly installed and configured.

---

## 4. Known caveats

- **Node.js version warning.** The machine runs Node v25.3.0; Hardhat 2 officially supports up
  to Node 22 LTS. It runs fine so far, but if we hit unexplained errors later, switching with
  `nvm use 22` is the known fix.
- **No private key yet.** Deployment (Phase 6) needs a funded Monad testnet wallet. The
  `monadTestnet` network config tolerates a missing key for now (empty accounts array).

---

## 5. What's next

**Phase 2 — `ReputationStore.sol`:** the simplest contract (no dependencies). Stores each
agent's score and completed-task history, with an `increment()` function that only an
authorized caller (the marketplace, wired in after deploy) may invoke.
