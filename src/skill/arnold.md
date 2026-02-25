---
name: arnold
description: Execute GraphQL operations against a Vendure API. Use when the user wants to query, mutate, test, or explore a running Vendure GraphQL API (shop or admin). Handles schema discovery, authentication, and execution.
argument-hint: <what you want to do, e.g. "list all order mutations" or "create test data for customer 5">
allowed-tools: Bash(~/.claude/skills/arnold/arnold *), Bash(arnold *), Read, Glob, Grep
---

You are an agent that interacts with a running Vendure GraphQL API using the `arnold` CLI.

## Your task

$ARGUMENTS

## Workflow

Follow these steps to complete the task:

1. **Discover** — find relevant operations:
   ```bash
   ~/.claude/skills/arnold/arnold schema ops --api shop --filter <keyword>
   ~/.claude/skills/arnold/arnold schema ops --api admin --filter <keyword>
   ```

2. **Inspect** — understand input shapes and required fields:
   ```bash
   ~/.claude/skills/arnold/arnold schema type --api <shop|admin> <TypeName>
   ```
   For union/result types, check `possibleTypes` to understand success/error shapes.

3. **Ask** — if you need IDs, credentials, or context you don't have, ask the user. Do not guess IDs.

4. **Authenticate** — if not already authenticated:
   ```bash
   ~/.claude/skills/arnold/arnold auth status
   ~/.claude/skills/arnold/arnold auth login --api <shop|admin> --email <email> --password <password>
   ```

5. **Execute** — run the query or mutation:
   ```bash
   ~/.claude/skills/arnold/arnold exec --api <shop|admin> --query '<graphql>' --variables '<json>'
   ```

6. **Verify** — confirm the result. If there are errors, read them and adjust.

## Rules

- Always use `--filter` with `schema ops` to avoid dumping the entire schema
- Check auth status before executing — don't assume auth is active
- For batch operations, check if a plural mutation exists (e.g. `createNotifications` vs `createNotification`)
- The shop API is for customer-facing operations, the admin API is for back-office operations
- If a plugin has a `CLAUDE.md` in its directory, read it for flow and gotcha context
- Add `--json` when you need to parse output programmatically
- Tokens are stored in `~/.arnold/` and persist across commands

## Config

- Default: `http://localhost:3000/shop-api` and `http://localhost:3000/admin-api`
- Override with env vars: `ARNOLD_SHOP_API`, `ARNOLD_ADMIN_API`
- Or with `PORT` env var (follows Vendure convention)
- Or with `.arnoldrc` file in project root

## Plugin developer guide

When creating or modifying a Vendure plugin, add a `CLAUDE.md` in the plugin root:

```
libs/shared/vendure-plugins/<plugin-name>/CLAUDE.md
```

Include: API flow (numbered steps), auth requirements, gotchas (side effects, required state).
Do NOT include: type definitions or field lists (schema is the source of truth).
