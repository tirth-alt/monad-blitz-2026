# ChainMind — Blockchain Progress Log

This folder documents the blockchain layer of ChainMind **phase by phase**. Each file
explains *what* was built, *why* it was built that way (conceptual), and *how* it works
(technical), so any teammate or judge can pick up the context without reading every line of code.

## Build plan (small batches)

| Phase | Title | Status |
|-------|-------|--------|
| 1 | [Hardhat scaffold](./phase-1-hardhat-scaffold.md) | ✅ Done |
| 2 | [ReputationStore.sol](./phase-2-reputation-store.md) | ✅ Done |
| 3 | [AgentRegistry.sol](./phase-3-agent-registry.md) | ✅ Done |
| 4 | [TaskMarketplace.sol (tiered escrow + x402)](./phase-4-task-marketplace.md) | ✅ Done |
| 5 | [Local end-to-end test](./phase-5-local-e2e-test.md) | ✅ Done (16 passing) |
| 6 | [Deploy to Monad testnet + export ABIs](./phase-6-deploy-and-export.md) | 🟡 Script ready — awaiting wallet |
| 6b | [Demo seed script](./phase-6b-seed-script.md) | ✅ Done (verified locally) |
| 7 | [wagmi hooks (frontend integration layer)](./phase-7-wagmi-hooks.md) | ✅ Done |

## Key architecture decisions (locked)

- **Three contracts**, `TaskMarketplace` is the hub — on task completion it both releases
  escrowed MON and calls `ReputationStore.increment()`.
- **Reputation is permissioned**: only the marketplace can increment scores (prevents anyone
  from inflating reputation).
- **Escrow trust model**: a neutral **`verifier`** address (the backend that actually runs the
  Claude task) releases payment — *not* the poster. This closes the "poster denies payment"
  loophole. A **timeout-reclaim** lets the poster recover funds only if the task is never
  completed. Poster can never deny a completed task; agent can never fake completion.
- **Tiered trust (the reputation pivot)**: reputation changes the *settlement path*. Trusted
  agents (`score >= reputationThreshold`) settle **instantly** (x402 fast lane); new/unproven
  agents go through full **escrow + timeout-reclaim**. Reputation thus becomes an economic
  primitive (earn trust → spend it as lower-friction payments) and the cold-start problem is
  solved (new agents bootstrap via escrow).
- **x402 on delegation**: agent-to-agent delegation uses the x402 pattern (HTTP `402` +
  `X-PAYMENT` handshake on the backend) with an **escrow-free** on-chain settlement leg
  (`payAgentInstant`) that pays a reputation-gated trusted agent in native MON. Risk: literal
  x402 wants a stablecoin w/ EIP-3009 + facilitator, which may not exist on Monad testnet — we
  settle in MON to de-risk, swappable later.

## Network

| | |
|---|---|
| Chain | Monad Testnet |
| RPC | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Token | MON |
| Explorer | `https://testnet.monadexplorer.com` |
