# Custom Claude Skills Used in This Build

A **skill** in Claude Code is a reusable, versioned workflow with its own prompt, references, and conventions. Mine live in a private repo and are loaded automatically into every session — none of them were written *for* this interview; they pre-existed and I just invoked them.

**Public mirror of the skills I maintain:** https://github.com/huynguyenh/skills (subset of `~/.claude/skills/`, sanitised before publish).

---

## Skills invoked during this build

| Skill | Purpose | Where you see it in the final deliverable |
|---|---|---|
| `hnh-notion` | Read public / private Notion pages via API or browser | Read the challenge brief from `s5tech.notion.site/...` in the first minute |
| `hnh-plan` | Principal-engineer-level implementation plan template (Context → Decision → ACs → Scope → System Impact → Steps → Risk → Testing → Observability → Deployment) | [docs/plan.md](plan.md) follows that template verbatim |
| `hnh-design-guideline` | ZenLabs brand system — colour palette (Emerald 900, Firefly navy, Ecru warm neutral), Rubik + Inter typography, severity tokens, card patterns | Applied during the mid-session UI refresh (emerald hero on login, gradient status cards, severity-red Failed count) |
| `hnh-review-pr` *(full run planned)* | Deep PR review agent — build verification, architecture, DRY, test-coverage flag | Used as inspiration for the parallel-agent self-review (see `chore: hardening pass from self-review` commit) |
| `security-review` *(built-in)* | Anthropic's security-audit skill | Attempted; falls back to parallel security agent because the skill requires unpushed pending changes — findings still produced and acted on |

Beyond the listed skills, the session also relied on:
- **Claude in Chrome (MCP)** — to drive the browser for reading the Notion page when `WebFetch` couldn't render JS
- **Claude Preview (MCP)** — to boot the Vite dev server inside the IDE and capture evidence screenshots

---

## Why this matters

Planning ahead is the difference between "asked Claude to build a thing" and "ran a workflow I'd rehearsed". Every skill above has its own references file, conventions, and guardrails that I've iterated on over prior projects. On an interview timer, that's the gap between 4 hours of structured delivery and 4 hours of prompt-engineering triage.

---

## Pre-session setup checklist (what was already in place before the interview)

1. **Skills committed to `github.com/huynguyenh/skills`** — planning, PR review, design guideline, Notion/Drive/Sheets bindings, documentation templates, backup scripts. About 30 custom skills, versioned.
2. **Global `~/.claude/CLAUDE.md`** with discipline rules:
   - Always ask for Jira ticket before branching / planning
   - Never add Claude or AI attribution to commits, PRs, code, or docs
   - Always check memory before answering domain questions
3. **Persistent `memory/` directory** tracking user preferences, repo-specific conventions, git identity, credentials location, past feedback.
4. **MCP servers connected** — Notion, Google Docs/Sheets/Drive, Discord, Claude in Chrome, Claude Preview, Excalidraw, Sentry, AWS.
5. **Credentials in `~/.zshrc`** — read-only inline into commands; never committed.

None of this was set up during the 6-hour session. That's the point.
