# AGENTS.md

## Project

Calendar booking service (Hexlet educational project). Backend + frontend monorepo.

- **backend/** — Hono (Node.js), TypeScript (CommonJS), vitest + supertest
- **frontend/** — Vite + React 19 + TypeScript (ESM), Mantine UI, vitest + jsdom

Single pre-defined calendar owner, no auth. Guests book without registration. 14-day booking window. No double-booking or interval overlap. TypeSpec → OpenAPI → generated client SDK planned.

## Commands

All via mise. Never run npm directly at root.

```bash
mise run check          # lint + format:check + typecheck + test
mise run dev            # both dev servers
mise run dev:backend    # backend only
mise run dev:frontend   # frontend only
mise run build          # build both
```

Single test: `cd backend && npm run test` or `cd frontend && npm run test`

## Git Hooks

```bash
mise run hooks:install  # install pre-commit hooks (hk)
```

## Agent skills

### Issue tracker

GitHub Issues в этом репозитории. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Conventional Commits

All commits must follow Conventional Commits:

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, deps, config
- `docs:` — documentation
- `refactor:` — code refactoring
- `test:` — tests

### Ticket references

Every implementation commit must reference the ticket it closes in the commit message body or subject, using the format `(#NN)` where `NN` is the GitHub issue number. Examples:

- `feat: запись на свободный слот (#12)`
- `fix: корректная фильтрация слотов по дате (#13)`
- `chore: добавить drizzle-kit в backend (#11)`
