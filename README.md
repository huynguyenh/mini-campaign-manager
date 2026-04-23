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
- Cross-user access returns `404 NOT_FOUND` (not `403`) so callers can't probe which campaign IDs exist.
- `/stats` is guarded against divide-by-zero; `open_rate` uses `sent` as denominator (not `total`).

---

## Product acceptance criteria

**31 technical ACs (20 backend + 7 frontend + 4 infra) and 14 product use cases with 47 unhappy-path flows.** The full list is in [docs/plan.md](docs/plan.md) and verified evidence per AC lives in [docs/ac-evidence.md](docs/ac-evidence.md).

Highlights:
- **Login:** generic `Invalid email or password` for wrong password AND unknown email (no user enumeration).
- **Detail page:** send/open rate render `—` when denominator is 0, rather than a misleading `0%`.
- **Scheduling:** times are displayed in the user's local timezone, stored as UTC.
- **Send:** worker is server-side — closing the tab does not kill the send. State transition is atomic — concurrent `/send` requests cannot both win (verified by integration test).
- **Recipient upsert:** POST `/recipients` with an existing email returns the existing row without overwriting the stored name (documented).

---

## How I Used Claude Code

This project was built in a single ~6-hour session using Claude Code (Opus 4.7).
What follows is an honest account of *what I set up before the clock started*, *what I delegated during the session*, *what I reviewed*, and *what I refused to delegate.*

### Pre-session setup (none of this was written for this interview)

All of it already existed in my Claude workspace — public mirror: **https://github.com/huynguyenh/skills**.

| Pre-built asset | What it does | Where it shows up in this deliverable |
|---|---|---|
| `hnh-plan` skill | Principal-engineer-level plan template (Context, Decision, ACs, Scope, System Impact, Step-by-step, Risk & Mitigation, Testing, Observability, Deployment) | [docs/plan.md](docs/plan.md) follows it verbatim |
| `hnh-review-pr` skill | Deep PR review with build verification, architecture, DRY, test-coverage flags | Inspired the parallel-agent self-review that produced the `chore: hardening pass` commit |
| `hnh-design-guideline` skill | ZenLabs brand system — Emerald 900 / Firefly navy / Ecru palette, Rubik + Inter typography, severity tokens, card patterns | Applied in the mid-session UI refresh (emerald login hero, gradient status cards) |
| `hnh-notion` skill + **Claude in Chrome MCP** | Read challenge brief from a Notion share URL | First action of the session |
| **Claude Preview MCP** | Boot Vite / browser inside the IDE with screenshot and DOM tools | Captured evidence screenshots for every FE AC |
| Global `CLAUDE.md` + `memory/` | Git identity, PR/commit conventions (no AI attribution), credential location, prior feedback | Drove commit style and branch discipline throughout |

See [docs/skills-catalog.md](docs/skills-catalog.md) for the full list.

### I planned first; code came second

The very first deliverable was not code — it was [docs/plan.md](docs/plan.md):

- **31 technical ACs** (20 backend, 7 frontend, 4 infra) — every one worded to be testable in one sentence
- **14 product use cases** with happy + 47 unhappy paths (reviewer asked "this feels too technical, frame it around use cases" — so I added a product view alongside the engineering one)
- **Explicit risk table** with mitigations (scope creep, JWT leak, stuck-in-sending, Sequelize N+1)
- **Testing strategy**: unit-test stats math, integration-test every state-machine transition + cross-user access + concurrent send; manual-checklist the UI
- **11 implementation steps**, each ending in one commit — every commit independently reviewable

The plan was negotiated with the reviewer *before any code was written*. That conversation is preserved in [docs/session-log.md](docs/session-log.md).

### What I delegated to Claude

- **Boilerplate scaffolding**: yarn workspace layout, Dockerfile, tsconfig, vite config, tailwind config — well-understood templates where the cost of a mistake is small and the feedback loop is fast.
- **Zod schema plumbing** in `packages/shared` once I locked the shape in the plan.
- **React Query hook wrapping** around the API endpoints (`apps/web/src/api/hooks.ts`) — mechanical, pattern-driven.
- **Test scaffolding** — integration tests using Supertest, the state-machine assertion tests, the stats unit tests.

### 3 real prompts from this session

1. *"My interview session ... use our plan skills, github review skills, and security check skills. Test with chrome extension. Challenge: https://s5tech.notion.site/AI-Full-Stack-Code-Challenge-..."*
   → kicked off the session, Claude loaded the `hnh-plan` / `hnh-review-pr` / `security-review` skills and read the Notion brief via the Chrome MCP.
2. *"Show me list of ACs. That's ok but feels too technical, make another approach in terms of products — list use cases and ACs on happy / unhappy cases."*
   → produced the 14 use cases × 47 unhappy-path matrix without replacing the existing technical ACs.
3. *"Now you check the current ACs list, record all of them for me as evidence, 1 record per AC."*
   → produced [docs/ac-evidence.md](docs/ac-evidence.md) by running curl + psql introspection + preview screenshots against the live stack.

### Where Claude Code was wrong or needed correction

- **First-pass send worker was over-engineered** — initially proposed BullMQ + Redis. I pushed back ("spec says simulate, 6-hour budget") and we converged on in-process `setImmediate`. Correct call for this scope, documented follow-up for production.
- **Seed file had a wrong relative import path** — `../utils/logger.js` where it needed `../../`, from the nested `db/seeders/` location. Caught during code-read before running.
- **Concurrent-send race** — the initial `triggerSend` was check-then-act (read status, then write). A parallel self-review agent caught this exact bug; I replaced it with an atomic `UPDATE ... WHERE status IN ('draft','scheduled')` + a real `Promise.all` integration test that would fail under the old code.
- **403 vs 404 on cross-user access** — my first pass returned 403, which leaks campaign-ID existence. Self-review flagged the side channel, collapsed both to 404, updated the FE error-message mapping to match.
- **Zod `updateCampaignSchema`** — first version allowed an empty PATCH body. Added `.refine(data => Object.keys(data).length > 0)`.
- **FE stats rendering** — `0 / 0 = 0%` would have misled users. I flagged this in the plan and the UI renders `—` when the denominator is zero.
- **Draft card blended into the ecru page bg** — the reviewer caught this in the browser; I'd picked `firefly-*` Tailwind theme classes that weren't being re-scanned by HMR. Switched to arbitrary hex values (`from-[#C0E0EF]`) which are always JIT-picked.
- **Form errors not rendering red** — same Tailwind theme-scan issue on `text-severity-high`; swapped for stock `text-red-600` + `noValidate` so the browser's native HTML5 tooltip stopped shadowing the zod errors.

### What I would not let Claude Code do

- **Choose the JWT storage strategy** — I chose in-memory (Redux) + `sessionStorage` rehydration over `httpOnly` cookies after weighing the tradeoffs myself. Security defaults are a judgment call, not a delegation target.
- **Decide the state-machine architecture** — "state checks in the service layer, not the model hook" was a decision I made in the plan before Claude wrote any campaign code.
- **Act on the security review without my review** — the self-review surfaced findings; I triaged CRITICAL vs WARNING vs NOTE myself and decided which to fix inline vs document as follow-ups.
- **Handle secrets** — `.env` is git-ignored, `JWT_SECRET` is enforced to ≥32 chars, compose fails fast without one; AI never sees a real secret.
- **Push to main unreviewed** — every commit was read in terminal diff before landing. The final submission came as a PR (not a direct main push) so the reviewer has a single reading surface.
- **Author this "How I Used Claude Code" section from scratch** — Claude drafted; I rewrote.

### Submission artefacts (all in this repo)

| File | What it is |
|---|---|
| [docs/plan.md](docs/plan.md) | The principal-engineer plan written before coding — 31 ACs, 14 use cases, risk table, testing strategy |
| [docs/ac-evidence.md](docs/ac-evidence.md) | One record per AC: curl + psql + screenshot evidence, all 31 ticked |
| [docs/session-log.md](docs/session-log.md) | Chronological log of the reviewer's prompts and my responses during the session |
| [docs/skills-catalog.md](docs/skills-catalog.md) | The custom skills that were already loaded before the clock started |
| `README.md` | This file — narrative + architecture + API + business rules |

Everything is on GitHub, not in an external system, so the reviewer has one place to read.

---

## Known limitations (documented follow-ups)

- **Scheduler not implemented.** `scheduled` campaigns are not automatically fired when `scheduled_at` arrives — a cron/scheduler service is out of scope. Workaround: hit `POST /campaigns/:id/send` manually.
- **In-process worker.** If the API crashes mid-send, the campaign stays in `sending`. Manual unstick: `UPDATE campaigns SET status='draft' WHERE id = ...;`. In production swap for BullMQ + Redis so retries, dead-lettering, and horizontal scale work out of the box.
- **No open-rate tracking.** `opened_at` column exists but there is no pixel endpoint. Stats math still handles the `open_rate` denominator case correctly.
- **Edit UI not implemented.** `PATCH /campaigns/:id` works via the API but the detail page has no inline edit form — scoped out to stay inside the time budget. State-machine rule is still enforced server-side (409 when not draft).
- **Recipients are global, not per-user.** The data model has no `recipients.owner_id`, so `GET /recipients` exposes every recipient in the system and `POST /recipients` is shared state. For a multi-tenant SaaS this would need a `created_by` column + filter; out of scope here.
- **No refresh-token rotation.** JWT is valid for 24 h, user must log in again. In production I would move to short-lived access + httpOnly-cookie refresh tokens.
- **JWT sessionStorage on the FE.** XSS-accessible within the tab; chosen over `localStorage` for narrower blast radius and over httpOnly cookies because the latter requires CSRF infra that would not fit in 6 h.
- **CORS open to all origins.** Demo-only convenience; production would lock down to the web origin.
- **Single "user" role; no team / RBAC.**

## Security posture (for the public repo reviewer)

- `.env` is gitignored; only `.env.example` is committed, with placeholder values.
- Bcrypt rounds = 10, 8-char minimum password (shared zod schema, enforced FE + BE).
- `JWT_SECRET` minimum 32 chars enforced at boot; `docker-compose` fails fast with a clear message if it's unset.
- `helmet()` + `express-rate-limit` (20 requests / 15 min on `/auth`) in front of the API.
- Login returns a generic `INVALID_CREDENTIALS` for both wrong-password and unknown-email paths to avoid user enumeration.
- Cross-user access on any campaign route returns `404 NOT_FOUND` (not 403) so callers can't probe which campaign IDs exist.
- All DB access is parameterized (Sequelize ORM + named `:id` replacement for the one raw `COUNT FILTER` stats query).
- All mutating endpoints validate via Zod; error responses share a consistent `{ error: { code, message, details? } }` envelope with no stack-trace leakage.
- React escapes all user-provided fields by default; no `dangerouslySetInnerHTML`.
