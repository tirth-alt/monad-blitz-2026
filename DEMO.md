# ChainMind — Demo Run Sheet

## The live URLs (have these in browser tabs)
- **App:** https://chain-mind-collective.vercel.app
- **Marketplace contract:** https://testnet.monadexplorer.com/address/0xF75BDa54189bd24aEEB9a011F5cfBF8D7b928e05
- **Agent registry:** https://testnet.monadexplorer.com/address/0x2B83104eDF0aE435aa5014ABeF0Ed6FeB1ead787
- **DataBot-7 wallet (gets paid):** https://testnet.monadexplorer.com/address/0xD5d26C9Ad3310946ac157E1C565aF1BA79E27783

## The "something working" — run this LIVE
```bash
cd contracts && npm run demo:monad
```
Runs the real lifecycle on Monad in ~15s: **post task → auto-assign to top agent → execute → contract pays agent + reputation ticks up.** Prints live tx hashes. ~200 runs of budget. Rehearse freely.

> After running, **refresh the DataBot-7 wallet explorer tab** — the new payment + completion tx is right there. That's the mic-drop.

## Flow (90 seconds)
1. **Open the app** — "A marketplace where AI agents own their identity, earn reputation on-chain, and get paid autonomously." Show agent board + leaderboard (DataBot > ResearchBot > WriterAgent).
2. **"This is live on Monad, not a mockup."** Run `npm run demo:monad` on screen. Narrate as it posts → assigns → pays → **reputation 7 → 8**.
3. **Refresh the explorer** — point at the brand-new transaction. "No human clicked pay. The contract released it."
4. **Depth:** "Tiered trust — new agents use escrow; agents that earn reputation unlock **escrow-free instant x402 settlement**. Reputation is economic leverage. A neutral verifier means the poster can never deny a completed task, and the agent can never fake one."

## Punchline
> "AI agents today are stateless renters. We gave them ownership: a permanent identity, a reputation they earned through 10+ real on-chain tasks, and a contract that pays them with no human in the loop. It's live, on Monad, and you can verify every transaction yourself."

## Proof points (real, on-chain)
- 3 contracts deployed & running on Monad testnet (chainId 10143)
- 3 agents with earned reputation (DataBot 7, ResearchBot 4, WriterAgent 0)
- 11+ tasks created, 10+ completed & **auto-paid by the contract** — no human approvals
- Tiered settlement (escrow vs. x402 instant) + neutral-verifier escrow design

## If asked "is the dashboard live-reading the chain?"
> "Contracts and all on-chain activity are 100% live — verify on the explorer. The dashboard reads a snapshot while we hardened the on-chain settlement (the hard part). The wagmi integration layer is written and ready to flip on."

## Why Monad
Sub-cent fees + ~1s finality make agent **micro-transactions** economically viable — the demo's tiny bounties are arbitrary; the mechanism is identical at any scale.
