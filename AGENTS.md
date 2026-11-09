# AGENTS.md

## Project

Calendar booking service (Hexlet educational project). Backend + frontend monorepo.

- **backend/** — Hono (Node.js), TypeScript (CommonJS), vitest + supertest
- **frontend/** — Vite + React 19 + TypeScript (ESM), Mantine UI, vitest + jsdom

Single pre-defined calendar owner, no auth. Guests book without registration. 14-day booking window. No double-booking or interval overlap. TypeSpec → OpenAPI → generated client SDK.

## Commands

All via mise. Never run npm directly at root.

```bash
mise run check          # lint + format:check + typecheck + test (includes E2E)
mise run dev            # both dev servers
mise run dev:backend    # backend only
mise run dev:frontend   # frontend only
mise run build          # build both
mise run generate:api   # TypeSpec → OpenAPI → SDK (runs typespec:compile + frontend SDK generation)
mise run test:e2e       # browser E2E tests with Playwright (builds frontend, starts server, runs tests)
```

Single test: `cd backend && npm run test` or `cd frontend && npm run test`
Browser E2E: `mise run test:e2e` — requires Chromium installed (`npx playwright install chromium`)

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

## Generated files

The following paths are generated automatically and MUST NOT be edited manually:

| Path | Source | Generator |
|---|---|---|
| `backend/openapi/openapi.yaml` | `backend/typespec/main.tsp` | `@typespec/openapi3` |
| `frontend/src/api/generated/` | `backend/openapi/openapi.yaml` | `@hey-api/openapi-ts` |

To regenerate: `mise run generate:api` (compiles TypeSpec → OpenAPI → SDK in one command).

CI runs `generate:api` on every push and fails if the generated files differ from what is committed. If you modify TypeSpec or OpenAPI, always regenerate and commit the updated SDK.

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
