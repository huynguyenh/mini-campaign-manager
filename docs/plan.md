# INTERVIEW-S5: Mini Campaign Manager — Full-Stack Code Challenge

**Ticket**: [AI Full-Stack Code Challenge](https://s5tech.notion.site/AI-Full-Stack-Code-Challenge-32248905ea7780cd8796c1961de759ec)
**Date**: 2026-04-23
**Status**: Draft
**Branch**: `main` (direct commits on public repo; PRs for each feature vertical)
**Repo**: `github.com/huynguyenh/mini-campaign-manager` (public)
**Local convention path:** `~/ws/code/github.com/huynguyenh/mini-campaign-manager` (any clone path works)

## Context

Full-stack interview take-home for S5Tech. Build a MarTech Mini Campaign Manager where marketers can register, create email campaigns, attach recipients, schedule, simulate async sending, and track stats. Evaluation weighs backend correctness + business rules, API design, frontend UX, code quality, AI collaboration, and testing equally. Time budget ~6 hours, breadth-first.

## Decision

**Chosen approach**: Yarn-workspace monorepo with a Node/Express/Sequelize backend, a Vite/React/Redux-Toolkit frontend, PostgreSQL via Docker Compose, and in-process fire-and-forget async sending.

**Why this approach**: Matches the explicit tech requirements in the spec while keeping the infra surface small enough to finish inside 6 hours. Redux Toolkit is asked for by name; Vitest is shared across workspaces so we avoid two test configs; in-process `setImmediate` sending is the simplest way to demonstrate the `draft → sending → sent` transition without pulling in Redis/BullMQ.

**Alternatives considered**:
- **BullMQ + Redis worker** for async send: Rejected — 1–2h of infra work, spec explicitly says "simulate" so production-grade queueing is unnecessary.
- **Zustand** instead of Redux: Rejected — user explicitly chose Redux.
- **httpOnly cookie** JWT: Rejected — user chose Bearer token in memory; simpler CORS story for a demo.
- **Prisma** ORM: Rejected — spec forbids heavy ORMs; Sequelize is explicitly required in v2.

## Acceptance Criteria

### Backend — Schema & Data
- [ ] **AC-B1**: Sequelize migrations create `users`, `campaigns`, `recipients`, `campaign_recipients` with columns exactly as specified.
- [ ] **AC-B2**: Indexes on `campaigns.created_by`, `campaigns.status`, `campaign_recipients.campaign_id`, `campaign_recipients.recipient_id`, unique `(campaign_id, recipient_id)`.
- [ ] **AC-B3**: `users.email` and `recipients.email` are unique and lowercase-normalized.
- [ ] **AC-B4**: Seed script inserts 1 demo user, 20 recipients, 3 campaigns across states.

### Backend — Auth
- [ ] **AC-B5**: `POST /auth/register` creates a user with bcrypt-hashed password; rejects duplicate email with 409.
- [ ] **AC-B6**: `POST /auth/login` returns `{ token, user }`; wrong password returns 401.
- [ ] **AC-B7**: JWT middleware rejects missing/invalid/expired tokens with 401.

### Backend — Campaigns
- [ ] **AC-B8**: `GET /campaigns` returns paginated list (`?page=&pageSize=`), scoped to the authenticated user.
- [ ] **AC-B9**: `POST /campaigns` creates a campaign with status `draft`; body validated with zod; accepts optional `recipient_ids` array and attaches CampaignRecipient rows with status `pending`.
- [ ] **AC-B10**: `GET /campaigns/:id` returns campaign + nested stats + recipient list.
- [ ] **AC-B11**: `PATCH /campaigns/:id` updates fields only when status is `draft`; otherwise 409.
- [ ] **AC-B12**: `DELETE /campaigns/:id` deletes only when status is `draft`; otherwise 409.
- [ ] **AC-B13**: `POST /campaigns/:id/schedule` accepts `scheduled_at`; rejects past timestamps with 400; flips status to `scheduled`.
- [ ] **AC-B14**: `POST /campaigns/:id/send` transitions status `draft|scheduled → sending`, kicks off async worker, returns 202 immediately. Worker randomly marks each recipient sent/failed with ~90% success, sets `sent_at`, then flips campaign to `sent`. Once `sent`, further send attempts return 409.
- [ ] **AC-B15**: `GET /campaigns/:id/stats` returns `{total, sent, failed, opened, open_rate, send_rate}` with rates as decimals rounded to 4 places, guarded against divide-by-zero.

### Backend — Recipients
- [ ] **AC-B16**: `GET /recipients` returns all recipients (paginated).
- [ ] **AC-B17**: `POST /recipients` creates a recipient (idempotent by email — upsert semantics).

### Backend — Cross-cutting
- [ ] **AC-B18**: All error responses follow `{ error: { code, message, details? } }` shape.
- [ ] **AC-B19**: 404 on unknown campaign ID; 403 when a user tries to access another user's campaign.
- [ ] **AC-B20**: Request validation errors return 400 with field-level detail.

### Frontend
- [ ] **AC-F1**: `/login` form posts credentials, stores JWT in Redux memory, redirects to `/campaigns`. Wrong creds show inline error.
- [ ] **AC-F2**: `/campaigns` list page with pagination, status badges (grey/blue/amber/green for draft/scheduled/sending/sent), loading skeleton, error toast.
- [ ] **AC-F3**: `/campaigns/new` form with zod-validated fields, recipient multi-select, submits and navigates to detail page.
- [ ] **AC-F4**: `/campaigns/:id` detail showing stats (open rate + send rate progress bars), recipient table, action buttons conditionally rendered by status.
- [ ] **AC-F5**: Send action shows optimistic "sending..." state, polls `/stats` every 2s until campaign status is `sent`.
- [ ] **AC-F6**: Logout clears Redux state and redirects to `/login`.
- [ ] **AC-F7**: Protected routes redirect to `/login` when no token.

### Infra / DX
- [ ] **AC-I1**: `docker compose up` starts Postgres 16, runs migrations, seeds demo data, and boots backend on `:4000`.
- [ ] **AC-I2**: `yarn dev` runs backend and frontend concurrently via workspaces.
- [ ] **AC-I3**: `yarn test` runs all Vitest suites across workspaces.
- [ ] **AC-I4**: README documents local setup, demo login, architecture, and the **How I Used Claude Code** section.

## Product Acceptance Criteria (User-Story View)

Same coverage as the technical ACs above, reframed as use cases with happy + unhappy paths. Each UC maps to the technical ACs in brackets.

**Actor:** Marketer (authenticated user).

---

### UC-1: Sign up for an account — `[AC-B5, AC-B18, AC-B20]`

**Happy:**
- Given I'm a new user on `/register`
- When I submit a valid email, name, and password
- Then my account is created, I receive a JWT, and I land on `/campaigns`

**Unhappy:**
- **Duplicate email** → inline error "Email already registered" (409)
- **Weak password** (<8 chars) → field-level error before submission (400 from API as fallback)
- **Invalid email format** → field-level error
- **Server down** → toast "Something went wrong, try again"

---

### UC-2: Log in — `[AC-B6, AC-B7, AC-F1, AC-F7]`

**Happy:**
- Given I have an account
- When I enter correct email + password
- Then JWT is stored in Redux memory and I'm redirected to `/campaigns`

**Unhappy:**
- **Wrong password** → "Invalid email or password" (401 — message intentionally vague, no user-enumeration)
- **Unknown email** → same generic message (401)
- **Empty fields** → client-side validation blocks submit
- **Expired/tampered token (returning visitor)** → redirected to `/login` on next API call

---

### UC-3: Log out — `[AC-F6]`

**Happy:**
- Given I'm logged in
- When I click "Logout"
- Then Redux state clears, I'm redirected to `/login`, and the back button can't access protected pages

**Unhappy:**
- **Refresh after logout** → already at `/login`, protected routes redirect back

---

### UC-4: Browse my campaigns — `[AC-B8, AC-F2]`

**Happy:**
- Given I have campaigns
- When I open `/campaigns`
- Then I see a paginated list with name, status badge (grey/blue/amber/green), recipient count, created date

**Unhappy:**
- **No campaigns yet** → empty state "No campaigns yet. Create your first one."
- **API error** → toast "Couldn't load campaigns" + retry button
- **Slow network** → skeleton loaders appear within 200ms
- **I try to view another user's campaigns** → I don't see them in my list (scoped by `created_by`)

---

### UC-5: Create a campaign — `[AC-B9, AC-B20, AC-F3]`

**Happy:**
- Given I'm on `/campaigns/new`
- When I fill name, subject, body, and pick recipients from a searchable multi-select
- Then campaign is created with status `draft`, recipients attached as `pending`, and I navigate to `/campaigns/:id`

**Unhappy:**
- **Empty required field** → field-level error, submit disabled
- **Body exceeds max length** → inline counter + error
- **Recipient list empty** → allowed (can create draft with no recipients; warning shown)
- **Duplicate recipient picked twice** → UI dedupes before submit
- **Server validation fails** → toast with first error, form stays populated

---

### UC-6: View a campaign's details & stats — `[AC-B10, AC-B15, AC-F4]`

**Happy:**
- Given I own a campaign
- When I open `/campaigns/:id`
- Then I see subject/body, recipient table, stats (total, sent, failed, opened, open_rate, send_rate) with progress bars, and action buttons appropriate to its status

**Unhappy:**
- **Campaign not found / deleted** → 404 page "Campaign not found"
- **Another user's campaign** (URL guessing) → 403 page "You don't have access to this campaign"
- **Zero recipients** → stats show all zeros, rates show `—` instead of `0%` to avoid implying a real 0% open rate

---

### UC-7: Edit a draft campaign — `[AC-B11, AC-F4]`

**Happy:**
- Given my campaign is `draft`
- When I click Edit, change the subject, and save
- Then the campaign updates and `updated_at` advances

**Unhappy:**
- **Campaign is `scheduled`** → Edit button hidden in UI; direct PATCH → 409 "Campaign can only be edited while in draft"
- **Campaign is `sending`** or **`sent`** → same 409
- **Concurrent edit** (two tabs) → last write wins (documented, not guarded — out of scope for v1)

---

### UC-8: Delete a draft campaign — `[AC-B12]`

**Happy:**
- Given my campaign is `draft`
- When I click Delete and confirm
- Then the campaign and its `campaign_recipients` rows are removed; I'm returned to `/campaigns`

**Unhappy:**
- **Campaign not in `draft`** → Delete button hidden; direct DELETE → 409
- **I cancel the confirm dialog** → no-op
- **Accidental click** → native browser confirm prevents single-click destruction

---

### UC-9: Schedule a campaign — `[AC-B13, AC-F4]`

**Happy:**
- Given my campaign is `draft`
- When I pick a future date/time and click Schedule
- Then status flips to `scheduled`, `scheduled_at` is stored, badge turns blue, Schedule button is replaced with Send

**Unhappy:**
- **Past datetime picked** → inline error "Scheduled time must be in the future" + server 400 as defense in depth
- **Invalid datetime** → client validation blocks submit
- **Campaign already `sending`/`sent`** → Schedule hidden; direct POST → 409
- **Timezone confusion** → times displayed in user's local TZ, stored as UTC (documented)

---

### UC-10: Send a campaign — `[AC-B14, AC-F5]`

**Happy:**
- Given my campaign is `draft` or `scheduled` with ≥1 recipient
- When I click Send and confirm
- Then status flips to `sending` immediately (badge amber), worker processes recipients, UI polls stats every 2s, and within ~10s status becomes `sent` (badge green) with ~90% of recipients marked sent and ~10% failed

**Unhappy:**
- **Campaign has no recipients** → Send button disabled with tooltip "Add recipients before sending"
- **Campaign is already `sending`** → button disabled, shows spinner "Sending…"; direct POST → 409
- **Campaign is already `sent`** → button gone; direct POST → 409 "Campaign already sent"
- **User closes tab mid-send** → worker continues server-side; on return, stats reflect truth
- **Worker error (DB crash mid-send)** → campaign stuck in `sending`; documented as known limitation + manual unstick SQL in README

---

### UC-11: Watch send progress in real time — `[AC-B15, AC-F5]`

**Happy:**
- Given I triggered a send
- When I stay on the detail page
- Then stats + recipient table refresh every 2s, recipients flip from `pending` → `sent`/`failed` visibly, and rates climb until the campaign completes

**Unhappy:**
- **I navigate away** → polling stops; on return, I see final state
- **Network blip during polling** → one failed fetch is swallowed, polling continues
- **Worker finishes instantly (small recipient list)** → first poll already shows `sent`; no flicker

---

### UC-12: Add a recipient — `[AC-B17]`

**Happy:**
- Given I want a new recipient
- When I submit `{email, name}`
- Then recipient is created (or returned if email exists) — idempotent

**Unhappy:**
- **Invalid email format** → 400 with field error
- **Missing name** → 400
- **Email already exists with different name** → existing record returned unchanged (upsert-by-email doesn't overwrite); documented behavior

---

### UC-13: Browse recipients — `[AC-B16]`

**Happy:**
- Given recipients exist
- When I hit `GET /recipients`
- Then I get a paginated list ordered by `created_at DESC`

**Unhappy:**
- **Empty DB** → empty array, `total: 0`
- **Large offset** (page beyond last) → empty array, no error

---

### UC-14: Operate locally as a reviewer — `[AC-I1, AC-I2, AC-I3, AC-I4]`

**Happy:**
- Given I cloned the repo
- When I run `docker compose up` then `yarn dev`
- Then Postgres is up, migrations + seed run, backend responds on `:4000`, frontend renders at `:5173`, and I can log in with documented demo credentials

**Unhappy:**
- **Port 5432 in use** → compose fails with clear message; README documents the workaround
- **Missing `.env`** → boot fails with explicit "Copy `.env.example` to `.env`" message
- **`yarn test` fails** → README documents `yarn test --reporter=verbose` for diagnosis

---

### Coverage Matrix

| Use Case | Happy ✓ | Unhappy paths | Tech ACs covered |
|---|---|---|---|
| UC-1 Register | ✓ | 4 | B5, B18, B20 |
| UC-2 Login | ✓ | 4 | B6, B7, F1, F7 |
| UC-3 Logout | ✓ | 1 | F6 |
| UC-4 List | ✓ | 4 | B8, F2 |
| UC-5 Create | ✓ | 5 | B9, B20, F3 |
| UC-6 Detail | ✓ | 3 | B10, B15, F4 |
| UC-7 Edit | ✓ | 3 | B11, F4 |
| UC-8 Delete | ✓ | 3 | B12 |
| UC-9 Schedule | ✓ | 4 | B13, F4 |
| UC-10 Send | ✓ | 5 | B14, F5 |
| UC-11 Progress | ✓ | 3 | B15, F5 |
| UC-12 Add recipient | ✓ | 3 | B17 |
| UC-13 Browse recipients | ✓ | 2 | B16 |
| UC-14 Local setup | ✓ | 3 | I1, I2, I3, I4 |

**Totals:** 14 use cases · 14 happy flows · 47 unhappy paths · covers all 31 technical ACs.

---

## Scope

**In scope:**
- Everything in ACs B1–B20, F1–F7, I1–I4
- Vitest tests: auth, campaign state-machine rules, stats math, async send worker (≥3 meaningful — target 6–8)
- zod validators shared between request parsing and FE form typing where cheap
- Docker Compose with backend + Postgres (frontend runs via vite dev server locally, documented)

**Out of scope:**
- Email delivery (spec says "simulate"). No SMTP, no SendGrid.
- Real cron scheduler. `scheduled_at` is stored; actually firing scheduled campaigns is out of scope for 6h.
- Refresh token rotation. JWT is short-lived (24h), user re-logs in.
- Multi-tenant / role-based auth. Single "user" role.
- WebSockets for live stats. Polling is sufficient for demo.
- E2E tests (Playwright). Manual checklist in README.
- Open-rate tracking mechanism (no pixel endpoint). `opened_at` column exists but stays null; stats math still computes `open_rate`.
- CI/CD. Submission is a GitHub link.

**Follow-up work (documented in README, not implemented):**
- Replace in-process sending with BullMQ
- Add scheduler service (cron or BullMQ delayed jobs)
- Pixel tracking endpoint for opens
- Role-based authorization

## System Impact

### Repository layout

```
mini-campaign-manager/
├── package.json                 # workspaces root
├── yarn.lock
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── apps/
│   ├── api/                     # Express backend
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         # server entry
│   │   │   ├── app.ts           # express app factory (testable)
│   │   │   ├── config/          # env, db
│   │   │   ├── db/
│   │   │   │   ├── models/      # Sequelize models
│   │   │   │   ├── migrations/
│   │   │   │   └── seeders/
│   │   │   ├── middleware/      # auth, error, validate
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # controller, service, routes, validators
│   │   │   │   ├── campaigns/
│   │   │   │   └── recipients/
│   │   │   ├── workers/
│   │   │   │   └── sendCampaign.ts
│   │   │   ├── errors/          # AppError, error codes
│   │   │   └── utils/           # logger, jwt
│   │   ├── tests/               # vitest integration + unit
│   │   ├── vitest.config.ts
│   │   └── tsconfig.json
│   └── web/                     # React frontend
│       ├── package.json
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routes/
│       │   ├── store/           # Redux Toolkit slices
│       │   ├── api/             # axios client + React Query hooks
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── campaigns/
│       │   │   └── recipients/
│       │   ├── components/      # shared (StatusBadge, Skeleton, etc.)
│       │   └── lib/             # utils
│       └── tests/
└── packages/
    └── shared/                  # shared zod schemas + types
        ├── package.json
        ├── src/
        │   ├── campaign.ts
        │   ├── recipient.ts
        │   └── auth.ts
        └── tsconfig.json
```

### Database Schema

```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- campaigns
CREATE TYPE campaign_status AS ENUM ('draft','scheduled','sending','sent');

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- recipients
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- campaign_recipients (join + tracking)
CREATE TYPE recipient_status AS ENUM ('pending','sent','failed');

CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  status recipient_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  UNIQUE(campaign_id, recipient_id)
);
CREATE INDEX idx_cr_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_cr_recipient ON campaign_recipients(recipient_id);
CREATE INDEX idx_cr_campaign_status ON campaign_recipients(campaign_id, status);
```

**Index rationale**:
- `campaigns(created_by)` — list page scoped per user.
- `campaigns(status)` — future scheduler will poll `status = 'scheduled'`.
- `campaign_recipients(campaign_id)` — stats query and recipient list.
- `campaign_recipients(campaign_id, status)` — composite speeds up `COUNT(*) FILTER (WHERE status = 'sent')` in stats.
- Unique `(campaign_id, recipient_id)` — prevents duplicate sends.

### API Contracts

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | – | `{email, name, password}` | `201 {user, token}` |
| POST | `/auth/login` | – | `{email, password}` | `200 {user, token}` |
| GET | `/campaigns?page=&pageSize=` | ✓ | – | `200 {data, page, pageSize, total}` |
| POST | `/campaigns` | ✓ | `{name, subject, body, recipient_ids?}` | `201 Campaign` |
| GET | `/campaigns/:id` | ✓ | – | `200 {...campaign, stats, recipients}` |
| PATCH | `/campaigns/:id` | ✓ | `{name?, subject?, body?}` | `200 Campaign` |
| DELETE | `/campaigns/:id` | ✓ | – | `204` |
| POST | `/campaigns/:id/schedule` | ✓ | `{scheduled_at}` | `200 Campaign` |
| POST | `/campaigns/:id/send` | ✓ | – | `202 {status:'sending'}` |
| GET | `/campaigns/:id/stats` | ✓ | – | `200 Stats` |
| GET | `/recipients?page=&pageSize=` | ✓ | – | `200 {data,...}` |
| POST | `/recipients` | ✓ | `{email, name}` | `201 Recipient` |

Error envelope: `{ error: { code: string, message: string, details?: any } }`.

## Implementation Steps

Each step ends with a commit. Steps ≤ 2h each. Self-contained — independently reviewable.

### Step 1: Monorepo skeleton + Docker Compose
**Files**: root `package.json`, `docker-compose.yml`, `.env.example`, `apps/api/package.json`, `apps/web/package.json`, `packages/shared/package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`
**Why first**: Foundation — every subsequent step depends on this.

- Root `package.json` with `workspaces: ["apps/*", "packages/*"]`
- `docker-compose.yml`: `postgres:16` service with named volume, healthcheck; `api` service that runs migrations on boot
- Shared TS config with path aliases `@shared/*`
- Commit: `chore: bootstrap yarn workspace monorepo with docker-compose`

**Verification**: `docker compose up postgres` → `psql -h localhost -U campaign -d campaign` connects.

### Step 2: DB models + migrations
**Files**: `apps/api/src/db/models/*.ts`, `apps/api/src/db/migrations/*.sql`, `apps/api/src/db/index.ts`, `apps/api/src/db/seeders/demo.ts`
**Why next**: Auth and everything else reads/writes these.

- Sequelize instance wired to `DATABASE_URL`
- Four models: `User`, `Campaign`, `Recipient`, `CampaignRecipient` with associations
- Migration files numbered `001_*` to `003_*`
- Seed script: 1 user (`demo@example.com` / `demo1234`), 20 recipients, 3 campaigns (draft, scheduled, sent)
- Commit: `feat(api): add sequelize models and migrations`

**Verification**: `yarn workspace api migrate && yarn workspace api seed` → tables populated.

### Step 3: Express app skeleton + error middleware + auth module
**Files**: `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/middleware/*.ts`, `apps/api/src/modules/auth/**`, `apps/api/src/utils/jwt.ts`, `apps/api/src/errors/AppError.ts`
**Why here**: Gates every other endpoint. Small, testable in isolation.

- Express factory (`createApp()`) returns app for supertest
- Global error handler: maps `AppError` → structured JSON, ZodError → 400, unknown → 500
- `authMiddleware` verifies Bearer JWT, sets `req.user`
- `/auth/register` + `/auth/login` with bcrypt (cost 10) + jsonwebtoken
- zod schemas in `@shared/auth`
- Commit: `feat(api): add auth (register, login, JWT middleware)`

**Tests** (Vitest + supertest):
- `auth.integration.test.ts`: register happy path, duplicate email → 409, login wrong password → 401, protected route without token → 401

### Step 4: Campaigns module (CRUD + state machine)
**Files**: `apps/api/src/modules/campaigns/**`, shared zod schemas
**Why here**: Core feature. Entire state-machine enforced server-side.

- `campaignService`:
  - `list(userId, page, pageSize)`
  - `create(userId, dto)` — wraps insert + recipient attach in transaction
  - `get(userId, id)` — includes recipients + computed stats
  - `update(userId, id, dto)` — **throws if status !== 'draft'**
  - `delete(userId, id)` — **throws if status !== 'draft'**
  - `schedule(userId, id, scheduled_at)` — **throws if status !== 'draft'** or past timestamp
  - `stats(userId, id)` — single SQL query with `COUNT(*) FILTER (WHERE status = X)`
- Controllers thin, call service
- `CampaignAccessError` → 403 when `created_by !== req.user.id`
- Commit: `feat(api): add campaign CRUD with state-machine rules`

**Tests**:
- `campaign.rules.test.ts`: update denied on sent, delete denied on scheduled, schedule rejects past date
- `campaign.stats.test.ts`: open_rate math including zero-recipient edge case, rounding

### Step 5: Recipients module + Campaign-recipient attach
**Files**: `apps/api/src/modules/recipients/**`
**Why here**: Required by campaign create flow.

- `POST /recipients` — upsert-by-email (insert or return existing)
- `GET /recipients` — paginated
- Commit: `feat(api): add recipients endpoints`

### Step 6: Async send worker
**Files**: `apps/api/src/workers/sendCampaign.ts`, `apps/api/src/modules/campaigns/send.ts`
**Why here**: Final backend piece, depends on campaigns + recipients.

- `POST /campaigns/:id/send`:
  1. Load campaign; reject if status is `sent` or already `sending`.
  2. `UPDATE campaigns SET status='sending'`
  3. `setImmediate(() => runSend(id))`
  4. Return 202
- `runSend(id)`:
  - Load `campaign_recipients` for id
  - For each: simulate 50–200ms latency, 90% chance set status `sent` + `sent_at=NOW()`, 10% `failed`
  - Batch updates via `Promise.all` chunks of 10
  - On completion: `UPDATE campaigns SET status='sent'`
  - On any fatal error: log, leave campaign in `sending` (observable for debugging)
- Commit: `feat(api): add async send worker with simulated outcomes`

**Tests**:
- `send.worker.test.ts`: seeds 20 recipients, calls `runSend`, asserts exactly one `sent_at` per row, campaign ends `sent`, failure ratio within tolerance
- `send.idempotency.test.ts`: POST /send twice → second call 409

### Step 7: Frontend scaffold (Vite + TS + Redux + React Query + Tailwind + shadcn)
**Files**: `apps/web/*` scaffold, Tailwind config, shadcn init, base layout
**Why here**: Foundation for UI.

- `npm create vite@latest -- --template react-ts` then rewire to yarn
- Install: `@reduxjs/toolkit react-redux @tanstack/react-query react-router-dom axios zod react-hook-form @hookform/resolvers tailwindcss shadcn-ui`
- Base Axios client with auth interceptor that reads Redux token
- Auth slice: `{token, user}`, actions `loggedIn`, `loggedOut`
- Route guard component
- Commit: `feat(web): scaffold react + redux + react query + tailwind`

### Step 8: Login + Campaigns list pages
**Files**: `apps/web/src/features/auth/LoginPage.tsx`, `apps/web/src/features/campaigns/CampaignsListPage.tsx`, hooks
**Why here**: Happy-path critical path.

- Login: react-hook-form + zod, `useMutation` to `POST /auth/login`, on success dispatch `loggedIn`, navigate
- List page: `useQuery` to `/campaigns?page=&pageSize=`, status badges (shadcn `Badge`), skeleton while loading, toast on error
- Pagination controls (prev/next)
- Commit: `feat(web): add login page and campaigns list`

### Step 9: Campaign create + detail pages
**Files**: `apps/web/src/features/campaigns/CreateCampaignPage.tsx`, `DetailPage.tsx`
**Why here**: Completes the primary user journey.

- Create: form with react-hook-form, recipient multi-select (fetched from `GET /recipients`), on submit `POST /campaigns`
- Detail: stats cards with progress bars (send_rate, open_rate), recipient table, action buttons
- Action buttons conditionally rendered:
  - `draft` → Schedule, Send, Edit, Delete
  - `scheduled` → Send
  - `sending` → (disabled, "Sending…")
  - `sent` → none
- Send mutation: on click, optimistically set badge to `sending`, start polling `GET /campaigns/:id/stats` every 2s until campaign status = `sent` (refetch detail)
- Commit: `feat(web): add campaign create and detail pages`

### Step 10: Polish + README + seed script
**Files**: `README.md`, shadcn toast wiring, 404 route, final test pass
**Why last**: Everything else is built; now wrap it up.

- README sections:
  1. Quick start (`docker compose up && yarn dev`)
  2. Architecture diagram (ASCII)
  3. API reference (endpoints table)
  4. Business rules
  5. Testing (`yarn test`)
  6. **How I Used Claude Code** (real prompts from this session, where Claude was wrong, what I didn't delegate — written last, after implementation)
- Demo credentials box in login page placeholder
- Commit: `docs: add comprehensive README and demo script`

### Step 11: Final QA pass + `/hnh-review-pr` + `/security-review`
**Why**: Catch issues before submission.

- Run `/hnh-review-pr` on main branch diff (full repo)
- Run `/security-review` — expect findings on JWT secret handling, input validation edges
- Fix CRITICAL + WARNING
- Tag `v1.0.0`
- Commit: `chore: final polish from review pass`

## Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scope creep blows past 6h | High | High | Strict AC checklist; skip non-AC polish |
| Sequelize associations footgun (eager load N+1) | Medium | Medium | Use explicit `include` with `separate: true` for recipients; measure one query in detail page |
| Send worker leaks campaigns stuck in `sending` on crash | Medium | Low | Document as known limitation; note BullMQ as follow-up |
| JWT secret leaked to public repo | Low | Critical | `.env.example` with placeholder; `.env` in `.gitignore`; verify in `/security-review` |
| Redux + React Query overlap confusion | Medium | Low | Rule: server state in React Query, auth/ephemeral UI in Redux. Document in README. |
| zod schemas duplicated between shared + FE | Low | Low | Single source of truth in `packages/shared`, imported by both |
| Docker compose fails on reviewer's machine | Medium | High | Pin Postgres 16-alpine; healthcheck; tested on clean clone |

### Rollback Plan
N/A — interview project, not a production deploy.

### Feature Flag
N/A.

## Testing Strategy

### Testing Pyramid
Most confidence from **integration tests** hitting the real database via a disposable test schema (Vitest + supertest + Docker Postgres). A handful of **pure unit tests** for stats math and the send worker. **Manual checklist** for the frontend.

### Unit Tests (`apps/api/tests/unit/`)

| File | Case | Verifies | Priority |
|------|------|----------|----------|
| `stats.test.ts` | `computeStats_zero_recipients_returns_zero_rates` | Zero-div guard | Must |
| `stats.test.ts` | `computeStats_rounds_to_4_decimals` | Number format | Must |
| `sendWorker.test.ts` | `runSend_marks_each_recipient_exactly_once` | Worker correctness | Must |
| `sendWorker.test.ts` | `runSend_end_status_sent` | Terminal transition | Must |
| `jwt.test.ts` | `verifyToken_rejects_expired` | Auth primitive | Should |

### Integration Tests (`apps/api/tests/integration/`)

| Scenario | Setup | Action | Expected |
|----------|-------|--------|----------|
| Register happy path | clean DB | POST /auth/register | 201, user in DB, JWT returned |
| Register duplicate email | user exists | POST /auth/register same email | 409 |
| Login wrong pw | user exists | POST /auth/login bad pw | 401 |
| Create campaign with recipients | authed user, 5 recipients | POST /campaigns | 201, 5 rows in campaign_recipients status=pending |
| Update sent campaign blocked | campaign status=sent | PATCH /campaigns/:id | 409 `CAMPAIGN_NOT_DRAFT` |
| Delete scheduled blocked | campaign status=scheduled | DELETE /campaigns/:id | 409 |
| Schedule past date | draft campaign | POST /schedule with yesterday | 400 |
| Send then send again | draft campaign | POST /send, wait, POST /send | 202, then 409 |
| Stats after send | sent campaign with 10 recipients | GET /stats | total=10, sent≈9, failed≈1, send_rate≈0.9 |
| Cross-user access | user A's campaign | user B GET /campaigns/:id | 403 |

### Frontend Tests (`apps/web/tests/`)

Keep light — one or two component tests using Vitest + Testing Library:
| File | Case |
|------|------|
| `StatusBadge.test.tsx` | Renders correct color per status |
| `useCampaignPolling.test.ts` | Polls every 2s until sent |

### Manual Verification Checklist (include in README)
1. `docker compose up` boots Postgres and API, migrations run, seed loads
2. `yarn dev` boots frontend on `:5173`
3. Log in with `demo@example.com / demo1234` → land on `/campaigns`
4. Status badges: draft grey, scheduled blue, sent green
5. Create campaign with 5 recipients → detail page shows them with pending status
6. Click Schedule → pick tomorrow → badge turns blue
7. Click Send on a draft → badge flashes amber "sending", then turns green within 10s, recipients mostly green a few red
8. Refresh page — state persists from DB
9. Try to edit a sent campaign → button hidden, API call (via devtools) returns 409
10. Log out → back to `/login`, protected route access redirects

### Test Checklist
- [ ] All new code paths covered by at least one test
- [ ] Auth edges covered (missing token, expired, wrong user)
- [ ] State machine rules covered (6 transitions — see AC-B11 to B14)
- [ ] Stats math edge cases (zero recipients, all failed, all sent)
- [ ] Integration tests run against real Postgres, not mocks
- [ ] `yarn test` green in both workspaces before PR

## Observability

For a 6-hour interview project, keep this lightweight but not empty:
- `pino` logger in the backend, JSON output, request ID per request
- Log lines: `auth.login.success`, `campaign.send.started`, `campaign.send.completed`, `campaign.send.failed`
- No metrics/alerts (out of scope); note "replace with OpenTelemetry in production" in README

## Deployment

### Pre-submission
- [ ] All ACs checked
- [ ] `yarn test` green
- [ ] `docker compose up` + `yarn dev` works from clean clone
- [ ] Secrets scrubbed — no `.env` committed
- [ ] `/hnh-review-pr` run, findings addressed
- [ ] `/security-review` run, findings addressed
- [ ] README "How I Used Claude Code" section written
- [ ] Demo video or screenshot recorded (optional, nice-to-have)
- [ ] Repo made public on GitHub

### Submission
- Push to `github.com/huynguyenh/mini-campaign-manager` (public)
- Send repo link + walkthrough summary

## Report

_(Update after implementation)_

### What We Did
- _pending_

### What We Tested
- _pending_

### What We Observed
- _pending_

### What's Left
- _pending_
