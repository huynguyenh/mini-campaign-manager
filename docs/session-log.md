# Interview Chat Log — AI Full-Stack Code Challenge
**Date:** 2026-04-23  
**Challenge:** [AI Full-Stack Code Challenge](https://s5tech.notion.site/AI-Full-Stack-Code-Challenge-32248905ea7780cd8796c1961de759ec)

---

## Session Overview
Demonstrating day-to-day AI-assisted workflow:
- Reading challenge specs
- Creating an implementation plan (`/hnh-plan`)
- Building features with AI pair-programming
- Running PR review (`/hnh-review-pr`)
- Running security check (`/security-review`)

---

## Chat Log

---

### [Me → Claude] Session Start
> "my interview session... use our plan skills, github review skills, and security check skills. Test with chrome extension. Challenge: [link]"

**Claude:** Setting up interview chat log, reading challenge via Chrome extension. Will apply plan → build → review → security workflow.

---

### [Claude] Challenge Summary (read via Chrome extension)

**Goal:** Mini Campaign Manager — MarTech tool for marketers to create/manage/track email campaigns. 4–8 hours.

**Tech stack (v2 — the updated spec):**
- Monorepo: Yarn workspaces
- Backend: Node.js + Express + PostgreSQL + **Sequelize** + JWT + zod/joi
- Frontend: React 18 + TypeScript (Vite) + React Query/SWR + **Zustand or Redux** + any UI lib
- Docker Compose for local setup
- ≥3 meaningful tests

**Data model:** User, Campaign, Recipient, CampaignRecipient (with `sent_at`, `opened_at`, status).

**Key endpoints:** auth (register/login), campaigns CRUD, `/schedule`, `/send` (async, random sent/failed), `/stats`, recipients CRUD.

**Business rules:**
- Edit/delete only on `draft`
- `scheduled_at` must be future
- `send` is irreversible
- `/stats` returns `{total, sent, failed, opened, open_rate, send_rate}`

**Status enum:** draft | scheduled | sending | sent

**Frontend:** login, `/campaigns` list with status badges + pagination, `/campaigns/new`, `/campaigns/:id` detail with stats + actions.

**Required in README:** "How I Used Claude Code" section (delegated tasks, real prompts, where AI was wrong, what I wouldn't let it do).

---

### [Me → Claude] Planning phase
> Asked to run `/hnh-plan` skill. Answered 6 clarifying questions: repo path + public, Redux, Bearer JWT, in-process async send, feature-complete with ACs + test cases, Vitest.

**Claude:** Wrote full implementation plan → [INTERVIEW-S5/2026-04-23-mini-campaign-manager.md](../../../.claude/plans/INTERVIEW-S5/2026-04-23-mini-campaign-manager.md)

Plan highlights:
- 11 implementation steps (repo skeleton → DB → auth → campaigns → recipients → worker → FE scaffold → login+list → create+detail → polish → review)
- 20 backend ACs + 7 frontend ACs + 4 infra ACs
- Test matrix: 5 unit + 10 integration + 2 FE tests + 10-step manual checklist
- Risk table with mitigations (scope creep, JWT leak, sent-stuck-in-sending)
- Final step bakes in `/hnh-review-pr` + `/security-review` before submission

---

### [Me → Claude] "show me list of ACs" → "feel too technical, make another approach in terms of products"
> Asked for a product-oriented AC view alongside the technical one.

**Claude:** Added 14 use cases × happy + 47 unhappy paths, mapped back to technical ACs with a coverage matrix. Product-level nuances: generic login error (no user enumeration), em-dash instead of 0% when denominator=0, upsert preserves existing names.

---

### [Me → Claude] "plan looks good, please proceed"
> Greenlight to implement.

**Claude:** Delivered 10 vertical commits on `main`, public repo at https://github.com/huynguyenh/mini-campaign-manager.

| Commit | Summary |
|---|---|
| `chore: bootstrap` | Yarn workspaces + Docker Compose |
| `feat(api): sequelize models + migrations + seed` | 4 tables, citext email, indexes, demo data |
| `feat(api): express + auth + JWT` | register/login, bcrypt, generic login error, 3 tests |
| `feat(api): campaigns CRUD + state machine` | requireDraft, ownership, tx recipient attach, stats via COUNT FILTER, 5 tests |
| `feat(api): recipients endpoints` | upsert-by-email |
| `feat(api): async send worker` | setImmediate, 90% success, chunk Promise.all, 4 tests |
| `feat(web): scaffold` | Vite + Redux Toolkit + React Query + Tailwind + 401 interceptor |
| `feat(web): login + register + list` | zod forms, skeleton, pagination |
| `feat(web): create + detail` | multi-select recipients, stats progress bars, status-driven actions, 2s polling |
| `docs: README + How I Used Claude Code` | Full architecture, API table, business rules, honest AI-usage reflection |

---

### [Me → Claude] Final review pass
> Run `/security-review` and the GitHub review equivalent.

**Claude:** `/security-review` skill needed unpushed pending changes (inapplicable post-push), so ran two parallel principal-engineer agents instead. Findings:

**CRITICAL → fixed:**
- PAT embedded in local `.git/config` remote URL → rewrote URL, PAT only lives in macOS Keychain now
- Concurrent-send race (check-then-act) → atomic `UPDATE ... WHERE status IN ('draft','scheduled')`, added real `Promise.all` test
- 403/404 distinction leaked campaign-ID existence → collapsed to 404

**Should-fix → fixed:**
- Added `helmet()` + `express-rate-limit(20/15min on /auth)`
- JWT_SECRET minimum 32 chars, compose fails fast if unset
- FE: replaced `setState`-in-render polling with React Query's `refetchInterval` function signature
- Removed dead `logging: x ? false : false` ternary and unused exports

**Documented in README:**
- Global recipients (no per-user scoping)
- Edit UI not implemented (API works, UI scoped out)
- Security posture section added for the public-repo reviewer

Final commit: `chore: hardening pass from self-review (security + correctness)` — 12 files, 109 insertions, 55 deletions.

---

## Final state

- **Repo:** https://github.com/huynguyenh/mini-campaign-manager (public)
- **Commits:** 11 (10 feature verticals + 1 hardening)
- **Test coverage:** 5 unit + 11 integration + 2 FE
- **Plan:** `docs/plan.md`
- **Submission-ready:** `docker compose up postgres && yarn install && yarn workspace @mcm/api migrate && yarn workspace @mcm/api seed && yarn dev` → demo@example.com / demo1234



