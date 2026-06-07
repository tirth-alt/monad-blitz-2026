# ChainMind Backend (Person 3 — Backend / AI)

Standalone Node + TypeScript service that powers the AI layer of ChainMind:
**task execution**, **agent personas**, **agent-to-agent delegation**, and a
**real-time activity feed** sourced from Monad on-chain events.

> The blockchain (Person 1) is the source of truth for identity, escrow and
> reputation. This service owns everything off-chain: running the AI, storing
> results, and producing a `resultHash` that gets anchored on-chain.

---

## Stack

| Concern        | Choice                              |
| -------------- | ----------------------------------- |
| Runtime        | Node 20+ / TypeScript (ESM)         |
| HTTP           | Express + helmet + cors + rate-limit|
| AI             | Groq (free) — Llama 3.3 70B         |
| Storage        | SQLite (`better-sqlite3`)           |
| Chain reads    | viem (Monad testnet)                |
| Validation     | zod                                 |
| Logging        | pino                                |

---

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then add your GEMINI_API_KEY
npm run dev                 # http://localhost:4000
```

**Get a free Groq key:** https://console.groq.com/keys → paste into
`GROQ_API_KEY` in `.env`. Without a key (or with `AI_MOCK_MODE=true`) the
service runs in **mock mode** — every endpoint still works with canned results,
which is also the live-demo fallback if the API is slow.

| Script              | Does                                  |
| ------------------- | ------------------------------------- |
| `npm run dev`       | watch + restart                       |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run build`     | compile to `dist/`                    |
| `npm start`         | run compiled build                    |
| `npm run db:reset`  | wipe the SQLite tables                |

---

## API

Base URL: `http://localhost:4000/api`

| Method | Path                       | Purpose                                            |
| ------ | -------------------------- | -------------------------------------------------- |
| GET    | `/health`                  | status + whether AI/chain are live                 |
| POST   | `/auth/register`           | **sign up** any wallet as human/agent → token      |
| POST   | `/auth/login`              | **log in** with `{ walletAddress, role }` → token  |
| GET    | `/auth/me`                 | current user (needs `Authorization: Bearer`)       |
| GET    | `/dashboard`               | **role-aware** dashboard (agent vs human)          |
| GET    | `/agents`                  | list all agents                                    |
| GET    | `/agents/:address`         | one agent + its task history                       |
| POST   | `/agents`                  | register an agent (persona/metadata)               |
| POST   | `/agents/seed`             | (re)create the 3 demo agents                       |
| POST   | `/execute-task`            | **run a task with an agent** → returns `resultHash`|
| POST   | `/delegate`                | Agent A delegates a subtask to Agent B             |
| GET    | `/tasks/results`           | recent execution results                           |
| GET    | `/tasks/:taskId/results`   | results for one on-chain task                      |
| GET    | `/feed/recent`             | last 25 feed events                                |
| GET    | `/feed/stream`             | **SSE** live event stream                          |

### Login & roles

Two roles: **`agent`** (AI worker that executes & earns) and **`human`** = the
**client** who posts tasks. Login is wallet + role only — no password.

**Hardcoded demo accounts** (created by `POST /agents/seed`):

| Role  | Name          | Wallet                                         |
| ----- | ------------- | ---------------------------------------------- |
| agent | `Demo agent`  | `0x...e5` (also an executable agent, rel 8.9)  |
| human | `demo human`  | `0x...d4`                                       |

**Any other wallet self-registers** (e.g. a real MetaMask client):

```bash
# client signs up + is auto-logged-in → returns { token, user }
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1111...","role":"human","displayName":"alice"}'

# agent signup also needs a category; starts BELOW the reliability threshold
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x2222...","role":"agent","displayName":"newbie","category":"writing"}'

# returning users log in
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x00000000000000000000000000000000000000d4","role":"human"}'

# use the token on protected routes
curl http://localhost:4000/api/dashboard -H "Authorization: Bearer <token>"
```

`GET /dashboard` returns a different payload per role:
- **agent** → its profile, completed-task history, and performance stats
- **human** → tasks it posted, hireable agent roster, recent marketplace activity

When a logged-in human calls `POST /execute-task`, the task is automatically
attributed to them (so it appears on their dashboard).

### Reliability threshold

Every agent has a **reliability score (0–10)**. Only agents at or above
`RELIABILITY_THRESHOLD` (default **8.0**) may be assigned/execute/be delegated
tasks — otherwise the request is rejected with `403 BELOW_RELIABILITY_THRESHOLD`.
Self-registered agents start at `5.0` (unproven) and must be promoted; the
hardcoded demo agents are all seeded above 8.0. The threshold is returned by
`/health` and the human dashboard, and each agent in the dashboard roster is
tagged with an `eligible` boolean.

### Execute a task

```bash
curl -X POST http://localhost:4000/api/execute-task \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "1",
    "agentAddress": "0x00000000000000000000000000000000000000a1",
    "description": "Summarize the latest trends in DePIN"
  }'
```

Response:

```jsonc
{
  "result": {
    "id": "uuid",
    "taskId": "1",
    "agent": "DataBot-7",
    "summary": "Research brief on ...",
    "confidence": 0.9,
    "executionTimeMs": 1840,
    "model": "llama-3.3-70b-versatile",
    "resultHash": "0x…",   // ← submit this to completeTask(taskId, resultHash)
    "status": "completed"
  }
}
```

---

## Integration notes for the team

**For Person 1 (Blockchain):**
- Set the three `*_ADDRESS` vars in `.env` after deploying. The event listener
  auto-activates for any contract that has an address.
- Replace the placeholder event ABIs in `src/services/chain/abis.ts` with your
  real exported ABIs (the keys must match the event names you `emit`).
- `POST /execute-task` returns `resultHash` (keccak256 of the AI output) — call
  `completeTask(taskId, resultHash)` with it to release escrow.

**For Person 2 (Frontend):**
- Set `CORS_ORIGIN` in `.env` to your Next.js origin (default `http://localhost:3000`).
- Live feed: `new EventSource('http://localhost:4000/api/feed/stream')` — each
  message has `event:` = the type and `data:` = JSON payload.
- Seed agents on first load with `POST /agents/seed`.

---

## Project layout

```
src/
├── index.ts              entry: start server + chain listener + graceful shutdown
├── app.ts                express app + security middleware
├── config/env.ts         zod-validated environment (fail-fast)
├── lib/                  logger (pino), typed errors
├── db/                   sqlite connection + schema + reset
├── middleware/           validate, asyncHandler, errorHandler
├── services/
│   ├── ai/               groq client, personas, executor (+mock fallback)
│   ├── chain/            viem client, event ABIs, event listener
│   ├── agents.service.ts CRUD over the agents table
│   ├── tasks.service.ts  execution results + keccak result hashing
│   ├── feed.ts           in-process event bus + persistence (drives SSE)
│   └── seed.ts           the 3 demo agents
├── routes/               agents, execute, delegate, tasks, feed (+schemas)
└── types/                shared types
```

## Security practices baked in

- Env validated at startup; secrets never logged (pino redaction).
- `helmet`, locked-down CORS, JSON body size cap, per-IP rate limiting.
- All input validated with zod; central error handler hides internals in prod.
- `.env` and `*.db` are git-ignored — no secrets/data committed.
