# ChainMind Backend (Next.js · Person 3 — Backend / AI)

Next.js (App Router) API service powering the AI layer of ChainMind:
**task execution**, **agent personas**, **wallet+role auth**, **agent-to-agent
delegation**, and a **live activity feed** — built for **Vercel serverless**.

> The blockchain (Person 1) is the source of truth for identity, escrow and
> reputation. This service owns everything off-chain: running the AI, storing
> results, and producing a `resultHash` that gets anchored on-chain.

---

## Stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 15 (App Router, API routes)      |
| AI             | Groq (free) — Llama 3.3 70B              |
| Storage        | libSQL — local file (dev) / Turso (prod) |
| Chain reads    | viem (Monad testnet)                     |
| Auth           | JWT (wallet + role)                      |
| Validation     | zod                                      |
| Deploy target  | Vercel (serverless)                      |

### Serverless design notes
Three things differ from a long-running server, because serverless functions
are short-lived and stateless:
- **DB** → libSQL/Turso (Vercel's filesystem is ephemeral). Dev uses a local
  `file:` DB; prod points `DATABASE_URL` at a free Turso DB.
- **Live feed** → **polling**, not SSE. Clients poll `GET /api/feed/recent?since=`.
- **Chain events** → a **Vercel Cron** hits `GET /api/chain/poll` every minute
  to fetch new logs (replaces a persistent watcher). See `vercel.json`.

---

## Setup

```bash
cd backend
npm install
cp .env.example .env.local      # then add GROQ_API_KEY (and Turso creds for prod)
npm run dev                     # http://localhost:4000
```

**Free Groq key:** https://console.groq.com/keys → `GROQ_API_KEY` in `.env.local`.
Without a key (or with `AI_MOCK_MODE=true`) the service runs in **mock mode** —
every endpoint works with canned results (also the live-demo fallback).

In dev, `DATABASE_URL=file:./data/chainmind.db` works out of the box.

| Script              | Does                          |
| ------------------- | ----------------------------- |
| `npm run dev`       | dev server on :4000           |
| `npm run build`     | production build              |
| `npm start`         | run built app                 |
| `npm run typecheck` | `tsc --noEmit`                |

---

## API

Base URL: `http://localhost:4000/api`

| Method | Path                       | Purpose                                            |
| ------ | -------------------------- | -------------------------------------------------- |
| GET    | `/health`                  | status + AI/chain/threshold info                   |
| POST   | `/auth/register`           | sign up any wallet as human/agent → token          |
| POST   | `/auth/login`              | log in with `{ walletAddress, role }` → token      |
| GET    | `/auth/me`                 | current user (needs `Authorization: Bearer`)       |
| GET    | `/dashboard`               | role-aware dashboard (agent vs human/client)       |
| GET    | `/agents`                  | list all agents                                    |
| POST   | `/agents`                  | register an agent (persona/metadata)               |
| POST   | `/agents/seed`             | (re)create demo agents + Demo agent/demo human     |
| GET    | `/agents/:address`         | one agent + its task history                       |
| POST   | `/execute-task`            | run a task with an agent → returns `resultHash`    |
| POST   | `/delegate`                | Agent A delegates a subtask to Agent B             |
| GET    | `/tasks/results`           | recent execution results                           |
| GET    | `/tasks/:taskId/results`   | results for one on-chain task                      |
| GET    | `/feed/recent`             | live feed (poll; `?since=ISO` for new-only)        |
| GET    | `/chain/poll`              | cron-only: ingest new on-chain events              |

### Login & roles

Two roles: **`agent`** (AI worker that executes & earns) and **`human`** = the
**client** who posts tasks. Login is wallet + role only — no password.

Hardcoded demo accounts (via `POST /agents/seed`):

| Role  | Name          | Wallet                                         |
| ----- | ------------- | ---------------------------------------------- |
| agent | `Demo agent`  | `0x...e5` (executable agent, reliability 8.9)  |
| human | `demo human`  | `0x...d4`                                       |

Any other wallet self-registers:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1111...","role":"human","displayName":"alice"}'

curl http://localhost:4000/api/dashboard -H "Authorization: Bearer <token>"
```

### Reliability threshold

Agents have a **reliability score (0–10)**. Only agents at/above
`RELIABILITY_THRESHOLD` (default **8.0**) may execute/be delegated tasks; below
that → `403 BELOW_RELIABILITY_THRESHOLD`. Self-registered agents start at `5.0`
(unproven); demo agents are seeded above 8.0.

### Execute a task

```bash
curl -X POST http://localhost:4000/api/execute-task \
  -H "Content-Type: application/json" \
  -d '{"taskId":"1","agentAddress":"0x...e5","description":"Summarize DePIN trends"}'
# → { result: { summary, confidence, resultHash, model, status, ... } }
```

The `resultHash` (keccak256 of the output) is what Person 1 submits to
`completeTask(taskId, resultHash)` to release escrow.

---

## Deploying to Vercel

1. Import the `backend/` directory as a Vercel project (root = `backend`).
2. Create a free **Turso** DB (https://turso.tech) → set `DATABASE_URL` +
   `DATABASE_AUTH_TOKEN`.
3. Set env vars in Vercel: `GROQ_API_KEY`, `JWT_SECRET` (strong!), `CORS_ORIGIN`
   (the frontend URL), and the Monad/contract vars from Person 1.
4. Set `CRON_SECRET` — `vercel.json` already schedules `/api/chain/poll` every
   minute; Vercel sends `Authorization: Bearer $CRON_SECRET`.

---

## Integration notes for the team

**Person 1 (Blockchain):** set `*_ADDRESS` + `MONAD_RPC_URL`; replace placeholder
event ABIs in `lib/services/chain/abis.ts`. The cron poller ingests events once
addresses are set. `POST /execute-task` returns the `resultHash` for `completeTask`.

**Person 2 (Frontend):** set `CORS_ORIGIN`. Auth: `POST /auth/login` → store
`token` → send `Authorization: Bearer`. Live feed: poll `/api/feed/recent?since=`
with the latest `created_at` you've seen.

---

## Project layout

```
backend/
├── app/
│   ├── page.tsx                 status page
│   └── api/                     route handlers (one folder per endpoint)
│       ├── health, auth/*, agents/*, dashboard,
│       ├── execute-task, delegate, tasks/*, feed/recent, chain/poll
├── lib/
│   ├── env.ts                   zod-validated environment
│   ├── db.ts / schema.ts        libSQL client + lazy schema init
│   ├── http.ts                  CORS, JSON, error wrapping, body validation
│   ├── auth.ts                  JWT sign/verify + principal extraction
│   ├── errors.ts logger.ts types.ts validation.ts
│   └── services/
│       ├── ai/                  groq client, personas, executor (+mock)
│       ├── chain/               viem client, ABIs, cron poller
│       ├── agents.ts tasks.ts users.ts feed.ts login.ts seed.ts
├── vercel.json                  cron schedule for /api/chain/poll
├── next.config.mjs  tsconfig.json  .env.example
```

## Security practices

- Env validated at startup; strong `JWT_SECRET` enforced at runtime in prod.
- Per-response security headers; allowlisted CORS; JSON body parsing.
- All input validated with zod; central error handler hides internals in prod.
- `.env*` and DB files git-ignored; agent reliability not user-settable on signup.
