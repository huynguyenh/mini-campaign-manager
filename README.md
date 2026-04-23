# Mini Campaign Manager

A simplified MarTech tool for marketers to create, schedule, and track email campaigns.
Full-stack take-home for S5Tech.

- **Backend:** Node.js 20, Express, PostgreSQL 16, Sequelize, JWT, Zod
- **Frontend:** React 18, TypeScript, Vite, Redux Toolkit, React Query, Tailwind CSS
- **Monorepo:** Yarn workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **Infra:** Docker Compose for Postgres + API

---

## Quick start

Prereqs: Docker, Node ≥ 20, Yarn 4 (via Corepack: `corepack enable`).

```bash
git clone https://github.com/huynguyenh/mini-campaign-manager.git
cd mini-campaign-manager

cp .env.example .env        # adjust JWT_SECRET if you want

docker compose up -d postgres   # start Postgres only
yarn install
yarn workspace @mcm/api migrate
yarn workspace @mcm/api seed

yarn dev                     # backend :4000 + frontend :5173
```

Or fully containerised:

```bash
docker compose up            # Postgres + API, migrations + seed run on boot
yarn workspace @mcm/web dev  # still run the Vite dev server locally
```

Demo credentials (after seed): `demo@example.com` / `demo1234`.

## Tests

```bash
yarn test                            # all workspaces
yarn workspace @mcm/api test         # backend unit + integration
yarn workspace @mcm/web test         # frontend
```

Integration tests hit a real Postgres (the one from `docker compose up postgres`) — no mocks.

---

## Architecture

```
┌────────────┐       HTTPS / JWT Bearer        ┌────────────────┐
│  web (Vite)│────────────────────────────────▶│  api (Express) │
│  Redux +   │                                  │   + Sequelize  │
│  React Q.  │                                  │                │
└────────────┘                                  └──────┬─────────┘
                                                       │
                                                       ▼
                                             ┌──────────────────┐
                                             │  PostgreSQL 16   │
                                             └──────────────────┘

Send worker:
  POST /campaigns/:id/send  ──▶  status=sending  ──▶  setImmediate(runSend)
                                                       │
                                                       ▼
                                           random per-recipient outcomes
                                           ~90% sent, 10% failed
                                                       │
                                                       ▼
                                                  status=sent
```

### Data model

Four tables with enums enforced at the DB layer:

- `users(id, email, name, password_hash, created_at)`
- `campaigns(id, name, subject, body, status[draft|scheduled|sending|sent], scheduled_at, created_by → users, created_at, updated_at)`
- `recipients(id, email, name, created_at)`
- `campaign_recipients(campaign_id → campaigns, recipient_id → recipients, status[pending|sent|failed], sent_at, opened_at)` with unique `(campaign_id, recipient_id)`

Indexes: `campaigns(created_by)`, `campaigns(status)`, `campaigns(scheduled_at) WHERE NOT NULL`, `campaign_recipients(campaign_id)`, `(recipient_id)`, and composite `(campaign_id, status)` for fast stats.

Email uses PostgreSQL `CITEXT` for case-insensitive uniqueness.

---

## API

All endpoints return a consistent error shape on failure:
`{ error: { code: string, message: string, details?: unknown } }`.

| Method | Path                          | Auth | Purpose                            |
|-------:|-------------------------------|:----:|------------------------------------|
| POST   | `/auth/register`              |      | Create user, return JWT            |
| POST   | `/auth/login`                 |      | Exchange creds for JWT             |
| GET    | `/campaigns?page=&pageSize=`  |  ✓   | Paginated list, scoped to caller   |
| POST   | `/campaigns`                  |  ✓   | Create draft (+ attach recipients) |
| GET    | `/campaigns/:id`              |  ✓   | Detail + stats + recipients        |
| PATCH  | `/campaigns/:id`              |  ✓   | Update (draft only → else 409)     |
| DELETE | `/campaigns/:id`              |  ✓   | Delete (draft only → else 409)     |
| POST   | `/campaigns/:id/schedule`     |  ✓   | Schedule (future-only → else 400)  |
| POST   | `/campaigns/:id/send`         |  ✓   | Kick off async send (202)          |
| GET    | `/campaigns/:id/stats`        |  ✓   | `{total, sent, failed, opened, open_rate, send_rate}` |
| GET    | `/recipients?page=&pageSize=` |  ✓   | Paginated list                     |
| POST   | `/recipients`                 |  ✓   | Upsert by email                    |

### Business rules (all enforced server-side)

- Edit / delete only when `status = 'draft'`.
- `scheduled_at` must be strictly in the future.
- `send` transitions `draft|scheduled → sending → sent`; re-sending a `sent` campaign returns `409 CAMPAIGN_ALREADY_SENT`.
- Cross-user access is `403 FORBIDDEN` (not `404`), to avoid leaking which campaign IDs exist via timing.
- `/stats` is guarded against divide-by-zero; `open_rate` uses `sent` as denominator (not `total`).

---

## Product acceptance criteria

See the accompanying plan for the full **14 use cases × happy + unhappy paths**. Highlights:

- **Login:** generic `Invalid email or password` for wrong password AND unknown email (no user enumeration).
- **Detail page:** send/open rate render `—` when denominator is 0, rather than a misleading `0%`.
- **Scheduling:** times are displayed in the user's local timezone, stored as UTC.
- **Send:** worker is server-side — closing the tab does not kill the send.
- **Recipient upsert:** POST `/recipients` with an existing email returns the existing row without overwriting the stored name (documented).

---

## How I Used Claude Code

This project was built in a single 6-hour session using Claude Code (Opus 4.7).
The process was explicit about *what I delegated*, *what I reviewed*, and *what I refused to delegate.*

### What I delegated

- **Boilerplate scaffolding**: yarn workspace layout, Dockerfile, tsconfig, vite config, tailwind config — well-understood templates where the cost of a mistake is small and the feedback loop is fast.
- **Zod schema plumbing** in `packages/shared` once I locked down the shape in the plan.
- **React Query hook wrapping** around the API endpoints (`apps/web/src/api/hooks.ts`) — mechanical, pattern-driven.
- **Test scaffolding** — integration tests using Supertest, the state-machine assertion tests, and the stats unit tests.

### 2–3 real prompts I used

1. *"Write a plan for a Mini Campaign Manager... Use the plan skill. Use ticket tag INTERVIEW-S5. Tech: Yarn workspaces monorepo (backend: Node/Express/PG/Sequelize/JWT/zod; frontend: React 18 + Vite + TS + React Query + Redux + Tailwind). At least 3 meaningful tests. Plan should cover: repo scaffolding, schema/migrations, auth, campaign CRUD, async send worker, stats, frontend pages, testing strategy, docker-compose, submission."*
2. *"Show me list of ACs. That's ok but feels too technical, make another approach in terms of products — list use cases and ACs on happy / unhappy cases."*
3. *"Proceed with implementation."* — then Claude worked the plan step by step, committing at the end of each vertical.

### Where Claude Code was wrong or needed correction

- **Planned `packages/shared` imports using `.js` extensions** (required for ESM) but initially imported the logger with a wrong relative path in the seeder (`../utils/logger.js` where it needed `../../`). Caught during code-read before any test ran.
- **Over-engineered the send worker first pass** — initially proposed BullMQ + Redis. I pushed back ("too much infra for 6 hours, the spec says 'simulate'") and we converged on in-process `setImmediate`.
- **Zod `updateCampaignSchema`**: first version allowed an empty body and would have silently no-op'd; had to add `.refine(data => Object.keys(data).length > 0)`.
- **Initial FE stats rendering**: `0 / 0 = 0%` would have misled the user into thinking opens were actually `0%`. I flagged the divide-by-zero edge case in the plan and we rendered `—` instead when the denominator was zero.

### What I would not let Claude Code do

- **Choose the JWT storage strategy** — I chose in-memory (Redux) + `sessionStorage` rehydration over `httpOnly` cookies after weighing the tradeoffs myself. Security defaults are a judgment call, not a delegation target.
- **Author the README's "how I used AI" narrative from scratch** — this section is a reflection on *my* judgment about AI, so I wrote and edited it manually.
- **Commit without reviewing the diff** — every commit in this repo was opened in the editor and read before landing. Claude does not push for me.
- **Decide whether the state machine belongs in the service or the model** — architectural decisions (service-layer checks with a helper `requireDraft`, ownership check before any state transition) were made explicitly by me in the plan before Claude wrote code.
- **Handle secrets** — `.env` is git-ignored; `JWT_SECRET` is never hardcoded; AI was never shown a real secret.

---

## Known limitations (documented follow-ups)

- `scheduled` campaigns are not automatically fired when `scheduled_at` arrives — a cron/scheduler service is out of scope. Workaround: hit `POST /campaigns/:id/send` manually.
- If the API crashes mid-send, the campaign stays in `sending`. Manual unstick: `UPDATE campaigns SET status='draft' WHERE id = ...;`.
- No open-rate pixel tracker implemented; `opened_at` column exists but stays `null`. Stats math still handles the open_rate case correctly.
- No refresh-token rotation; JWT is valid for 24 h, user must log in again.
- Single "user" role; no team / RBAC.

In production I would swap the in-process send worker for BullMQ + Redis so retries, dead-lettering, and horizontal scale work out of the box.
