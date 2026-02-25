# Arnold — Agent-First GraphQL API CLI

## Problem

Testing GraphQL APIs (especially in a Vendure/NestJS monorepo) requires too much manual setup. Agents and non-technical testers need a way to discover and execute API operations without writing raw queries or understanding the full schema upfront.

Existing tools (Yaak, Hurl, Postman) are either human-first, tied to desktop apps, or require maintaining separate workflow files that go stale.

## Core Principle

**The running GraphQL API is the source of truth.** Arnold reads from it via introspection — no snapshots, no generated files, nothing to maintain.

## Architecture

```
arnold CLI          → schema discovery + execution (always current)
skill               → teaches agent to use arnold (single file)
plugin CLAUDE.md    → multi-step flows + gotchas (colocated, optional)
```

### Three layers, each with a clear role

| Layer | What it does | Goes stale? |
|-------|-------------|-------------|
| `arnold` CLI | Introspects live schema, executes queries, handles auth | No — reads from live API |
| Skill (`arnold.md`) | Teaches agent how to use the CLI + how to document plugins | Rarely — it's a methodology, not a catalog |
| Plugin `CLAUDE.md` files | Describes multi-step flows, auth requirements, gotchas | Gracefully — schema is still ground truth if these drift |

## CLI Design

### Commands

```bash
# Configuration via env vars or .arnoldrc
ARNOLD_SHOP_API=http://localhost:3000/shop-api
ARNOLD_ADMIN_API=http://localhost:3000/admin-api

# Schema discovery (targeted introspection, not full dump)
arnold schema ops --api shop                          # list all queries + mutations
arnold schema ops --api shop --filter notification    # filtered by keyword
arnold schema type --api shop CreateNotificationInput # describe a specific type

# Authentication
arnold auth --api shop --email test@co.de --password xxx
# → stores token in ~/.arnold/session (reused by subsequent exec calls)

# Execution
arnold exec --api shop --query 'mutation { ... }' --variables '{...}'
arnold exec --api shop --file ./query.graphql --variables '{...}'
```

### Key design decisions

- **Targeted introspection**: `schema ops` and `schema type` run surgical introspection queries — not a full schema dump. This keeps output small and context-window-friendly for agents.
- **Session-based auth**: `arnold auth` stores a token that `arnold exec` reuses. Mirrors how a human uses GraphQL Playground.
- **Env-based config**: No config file required. `.arnoldrc` is optional convenience.

## Skill

Single file: `skill/arnold.md`

Two audiences in one document:

1. **For agents using arnold**: how to discover operations, inspect types, authenticate, and execute queries.
2. **For plugin developers**: how to write a `CLAUDE.md` for their plugin (what to include, where to put it, what NOT to duplicate from the schema).

## Plugin Documentation (CLAUDE.md)

Each Vendure plugin can have a colocated `CLAUDE.md`:

```
libs/shared/vendure-plugins/offers/CLAUDE.md
libs/shared/vendure-plugins/notifications/CLAUDE.md
libs/shared/vendure-plugins/requests/CLAUDE.md
```

These describe **intent and flow**, not types and fields (the schema handles that):

```markdown
# Offers Plugin

## API Flow
1. Auth as shop customer with `AccessOffers` permission
2. `createOffer` with productVariantId + quantities[]
3. Admin reviews: `updateOfferStatus(status: APPROVED)`
4. Customer sees it via `searchOffers`

## Key gotchas
- Offers require a company-linked customer, not just any customer
- Price tiers are auto-calculated from quantity brackets
```

Claude Code automatically picks these up via nested CLAUDE.md resolution when working in the plugin directory.

## Usage Scenarios

### Developer (Claude Code)

```
User: "make 30 test notifications for the CO tenant"

Agent:
1. arnold schema ops --api shop --filter notification → finds mutation
2. arnold schema type --api shop CreateNotificationInput → sees required fields
3. Doesn't have customerID → asks user
4. arnold auth --api shop --email ... --password ...
5. arnold exec --api shop --query "mutation { ... }" × 30
```

### Tester (GitHub PR comment bot)

Developer writes in PR description:

```markdown
## Test Plan
`/test create 30 notifications for customer 123 on staging`
```

Tester copies that into a PR comment. GitHub Action:
1. Picks up `/test` comment
2. Runs `arnold auth` + `arnold exec` against staging
3. Posts results back as a PR comment

Same CLI, different frontend.

### Tester (Claude Code / Claude Desktop)

Tester with Claude Code or Claude Desktop uses the same skill + CLI directly:

```
Tester: "Create 5 test notifications on staging for customer 42"
Claude: [uses arnold CLI to do it]
```

## Tech Stack

- **TypeScript** (matches target monorepo)
- **commander** for CLI framework
- **Plain fetch** for GraphQL HTTP calls
- **No build step required for consumers** — distributed as a CLI tool

## Project Structure

```
arnold/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entrypoint
│   ├── commands/
│   │   ├── schema.ts         # schema ops, schema type
│   │   ├── auth.ts           # authenticate, store token
│   │   └── exec.ts           # execute queries
│   ├── lib/
│   │   ├── introspect.ts     # targeted GraphQL introspection queries
│   │   ├── client.ts         # HTTP client with auth token reuse
│   │   └── config.ts         # load .arnoldrc / env vars
│   └── skill/
│       └── arnold.md         # the Claude Code skill
├── .arnoldrc.example
└── PLAN.md                   # this file
```

## What Arnold is NOT

- **Not a test framework** — no assertions, no test runner, no CI reports (use Vitest for that)
- **Not a schema generator** — no codegen, no TypeScript types (use graphql-codegen for that)
- **Not a flow/workflow engine** — no YAML files, no DSL, no saved sequences
- **Not an MCP server** — it's a CLI that agents call via bash, not a long-running process

## Future Considerations (not day one)

- **Recipes**: optional markdown files describing common multi-step flows for complex state machines (e.g., full order lifecycle). Only if plugin CLAUDE.md files prove insufficient.
- **Output formatting**: structured JSON output mode for CI/GitHub Action result parsing.
- **Multiple environments**: `--env staging` / `--env production` shorthand in `.arnoldrc`.
