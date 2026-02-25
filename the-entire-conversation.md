# Arnold — Design Conversation

## Starting Point

**Goal**: Build a CLI to help test GraphQL API endpoints, agent-first.

**Target codebase**: Vendure/NestJS/pnpm monorepo (`feddersen-monorepo`) with:
- Dual GraphQL APIs: shop-api (`/shop-api`) and admin-api (`/admin-api`)
- 15+ custom plugins (offers, notifications, requests, auth-flow, etc.)
- Multi-tenant (AKRO, CO)
- Bearer token + cookie auth, Microsoft SSO
- Existing `.graphql` operation files per tenant
- E2e tests via Vitest + Vendure testing utils
- No existing Hurl/Postman/dedicated API testing infrastructure

**Reference**: [Yaak CLI](https://yaak.app/docs/getting-started/cli-usage) — exists but unclear if it fits the use case.

---

## Exploration & Rejected Approaches

### Yaak CLI
- Agent-friendly, GraphQL support
- **Rejected**: tied to desktop app + local DB, not file-based

### Hurl
- Plain text files, chainable requests, GraphQL support
- **Rejected**: not agent-optimized, GraphQL is an afterthought

### Custom YAML flow files (first proposal)
- `.flow.yaml` files storing API sequences with steps, assertions, captures
- CLI for CRUD on flows + schema validation + skill export
- **Rejected**: over-engineered — basically Hurl with extra steps. Nobody asked for another DSL.

### MCP Server (second proposal)
- 5 tools: `list_operations`, `describe_operation`, `describe_type`, `execute_graphql`, `authenticate`
- Thin server that wraps GraphQL introspection
- **Replaced by CLI**: no server process needed, works in CI natively, simpler

---

## Key Insight: GraphQL Is Already Agent-Friendly

GraphQL schemas are self-documenting and machine-readable. An agent with introspection access + a way to execute queries already has everything it needs. The schema IS the documentation.

**What introspection gives**: all types, fields, arguments, descriptions, enums, deprecation info — always in sync.

**What it doesn't give**: how to authenticate (infra), side effects, business workflows, multi-step flow order.

---

## Final Architecture

Three layers, each with a clear role:

| Layer | What it does | Goes stale? |
|-------|-------------|-------------|
| `arnold` CLI | Introspects live schema, executes queries, handles auth | No — reads from live API |
| Skill (`arnold.md`) | Teaches agent how to use CLI + how to document plugins | Rarely — methodology, not catalog |
| Plugin `CLAUDE.md` files | Multi-step flows, auth requirements, gotchas | Gracefully — schema is ground truth |

### Why no workflow/flow files?
- Saved workflows = another thing to maintain, goes stale
- Agent composes queries on the fly from schema — that's what GraphQL is designed for
- If someone adds a new plugin, `arnold schema ops` shows it immediately

### Plugin CLAUDE.md instead of recipe files
- Colocated with the plugin code (`libs/shared/vendure-plugins/<name>/CLAUDE.md`)
- Claude Code auto-picks them up via nested CLAUDE.md resolution
- Maintained by the developer who builds the plugin
- Describes intent, flow order, and gotchas — NOT types and fields (schema handles that)
- Degrades gracefully if slightly stale

---

## CLI Design

```bash
# Config via env vars or .arnoldrc
ARNOLD_SHOP_API=http://localhost:3000/shop-api
ARNOLD_ADMIN_API=http://localhost:3000/admin-api

# Schema discovery (targeted introspection)
arnold schema ops --api shop                          # list all operations
arnold schema ops --api shop --filter notification    # filtered
arnold schema type --api shop CreateNotificationInput # describe a type

# Auth (stores token in ~/.arnold/session)
arnold auth --api shop --email test@co.de --password xxx

# Execution
arnold exec --api shop --query 'mutation { ... }' --variables '{...}'
arnold exec --api shop --file ./query.graphql --variables '{...}'
```

**Key design decisions**:
- Targeted introspection (not full schema dump) — small output, context-window-friendly
- Session-based auth — authenticate once, reuse token
- Env-based config — no config file required

---

## Skill Design

Single file `skill/arnold.md` with two sections:

1. **For agents**: how to discover operations, inspect types, authenticate, execute
2. **For plugin developers**: how to write a CLAUDE.md for their plugin

Not a separate "meta-skill" — just one document, two audiences.

---

## Non-Technical Tester Access

### GitHub PR Comment Bot
Developer writes test plan in PR. Tester comments `/test create 30 notifications for customer 123`. GitHub Action runs arnold against staging, posts results back.

### Claude Code / Claude Desktop
Testers with Claude access use the same skill + CLI. Type natural language, agent handles it.

### Architecture
```
                    ┌─────────────────┐
                    │  arnold CLI     │
                    │  (4 commands)   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
     Claude Code      GitHub Action     Claude Desktop
     (developers)     PR comment bot     (testers)
                      (testers)
```

Same CLI, multiple frontends. Each frontend is thin — just translates user intent to CLI calls.

---

## Example Flow

```
User: "make 30 test notifications for the CO tenant"

Agent:
1. arnold schema ops --api shop --filter notification → finds mutation
2. arnold schema type --api shop CreateNotificationInput → sees required fields
3. Doesn't have customerID → asks user
4. arnold auth --api shop --email ... --password ...
5. arnold exec --api shop --query "mutation { ... }" × 30
```

---

## Tech Stack

- TypeScript (matches target monorepo)
- `commander` for CLI
- Plain `fetch` for GraphQL
- No build step for consumers

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
│   │   ├── introspect.ts     # targeted introspection queries
│   │   ├── client.ts         # HTTP client with auth
│   │   └── config.ts         # load .arnoldrc / env vars
│   └── skill/
│       └── arnold.md         # the Claude Code skill
├── .arnoldrc.example
├── PLAN.md
└── the-entire-conversation.md
```

---

## What Arnold Is NOT

- Not a test framework (no assertions, no test runner)
- Not a schema generator (no codegen, no TS types)
- Not a flow/workflow engine (no YAML, no DSL, no saved sequences)
- Not an MCP server (CLI, not a daemon)

## Future Considerations (not day one)

- Output formatting: structured JSON for CI/GitHub Action parsing
- Multiple environments: `--env staging` shorthand
- Recipes: only if plugin CLAUDE.md proves insufficient for complex state machines
