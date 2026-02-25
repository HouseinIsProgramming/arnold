# Arnold

Agent-first GraphQL API CLI. Built with Bun + TypeScript.

## Development

```bash
bun run dev -- <args>           # run CLI in dev mode
bun run build                   # compile to single binary
bun run src/index.ts --help     # check available commands
```

## Architecture

- `src/commands/` — CLI commands (schema, auth, exec)
- `src/lib/` — shared libs (config, client, introspect)
- `src/skill/arnold.md` — Claude Code skill for agents

## Key decisions

- No workflow/flow files — the live GraphQL schema is the source of truth
- Targeted introspection — never dumps the full schema, queries surgically
- Session tokens stored in `~/.arnold/`
- Config via env vars (`ARNOLD_SHOP_API`, `ARNOLD_ADMIN_API`) or `.arnoldrc`
