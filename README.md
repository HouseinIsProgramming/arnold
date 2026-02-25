# arnold

Agent-first GraphQL CLI for [Vendure](https://www.vendure.io/). Discover, authenticate, and execute GraphQL operations from the command line or via AI agents.

Arnold uses **live schema introspection** — no generated files, no snapshots, nothing to maintain. The running API is always the source of truth.

## Features

- **Schema discovery** — find operations and inspect types via targeted introspection, not full schema dumps
- **Authentication** — login once, token persists across commands
- **Execution** — run queries and mutations with inline or file-based GraphQL
- **Agent-first** — ships as a Claude Code skill with `/arnold` slash command
- **Zero maintenance** — reads from the live API, nothing goes stale
- **Single binary** — compiled with Bun, no runtime dependencies

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/housien/arnold/main/install.sh | bash
```

This installs the `arnold` binary and the Claude Code skill.

## Quick start

```bash
# Discover what operations exist
arnold schema ops --api shop --filter notification

# Inspect the input type
arnold schema type --api admin CreateUserNotificationInput

# Authenticate
arnold auth login --api admin --email admin@example.com --password secret

# Execute a mutation
arnold exec --api admin --query 'mutation { createNotification(input: { ... }) { id } }'

# Check auth status
arnold auth status
```

## Usage with Claude Code

After installing, the `/arnold` slash command is available in Claude Code:

```
/arnold create 30 test notifications for customer 33
/arnold find all order-related mutations in the admin API
/arnold authenticate as superadmin and list recent orders
```

The agent will discover the schema, ask for any missing context (IDs, credentials), authenticate, and execute — typically in 2-3 steps.

## Commands

### `arnold schema ops`

List queries and mutations via introspection.

```bash
arnold schema ops --api shop                        # all shop operations
arnold schema ops --api admin --filter order         # filtered by keyword
arnold schema ops --api shop --compact               # names only
arnold schema ops --api admin --filter offer --json  # JSON output
```

### `arnold schema type`

Describe a specific GraphQL type — works with objects, inputs, enums, and unions.

```bash
arnold schema type --api shop Customer
arnold schema type --api admin CreateUserNotificationInput
arnold schema type --api admin NativeAuthenticationResult  # shows union members
```

### `arnold auth`

Manage authentication sessions.

```bash
arnold auth login --api admin --email admin@example.com --password secret
arnold auth login --api shop --email customer@example.com --password secret
arnold auth status          # check active sessions
arnold auth logout --api admin
```

Tokens are stored in `~/.arnold/` and automatically used by `arnold exec`.

### `arnold exec`

Execute GraphQL queries and mutations.

```bash
# Inline query
arnold exec --api shop --query '{ activeCustomer { id emailAddress } }'

# With variables
arnold exec --api admin --query 'mutation ($id: ID!) { deleteOrder(id: $id) { result } }' \
  --variables '{"id": "123"}'

# From file
arnold exec --api shop --file ./my-query.graphql --variables '{"limit": 10}'

# JSON output for parsing
arnold exec --api admin --query '{ orders { totalItems } }' --json
```

## Configuration

Arnold resolves the API URL with the following priority:

1. `ARNOLD_SHOP_API` / `ARNOLD_ADMIN_API` env vars (highest priority)
2. `.arnoldrc` file (searched up from current directory)
3. `PORT` env var — follows Vendure convention (`http://localhost:$PORT/shop-api`)
4. Default: `http://localhost:3000/shop-api` and `http://localhost:3000/admin-api`

### `.arnoldrc`

```bash
ARNOLD_SHOP_API=http://localhost:3000/shop-api
ARNOLD_ADMIN_API=http://localhost:3000/admin-api
```

## Plugin documentation

For multi-step workflows that aren't obvious from the schema alone, add a `CLAUDE.md` to the plugin directory:

```
libs/shared/vendure-plugins/<plugin-name>/CLAUDE.md
```

Include the API flow (numbered steps), auth requirements, and gotchas. Do **not** duplicate type definitions — the schema handles that.

```markdown
# Offers Plugin

## API Flow
1. Auth as shop customer with `AccessOffers` permission
2. `createOffer` with productVariantId + quantities[]
3. Admin reviews: `updateOfferStatus(status: APPROVED)`
4. Customer sees it via `searchOffers`

## Gotchas
- Offers require a company-linked customer
- Creating an offer emits `OfferCreatedEvent` (triggers notification email)
```

Claude Code automatically picks up these files when working in the plugin directory.

## Building from source

```bash
git clone https://github.com/housien/arnold.git
cd arnold
bun install
bun run build        # compile to ./arnold binary
bun run build:all    # cross-compile for darwin-arm64, darwin-x64, linux-x64
```

## Releasing

Tag a version and push — GitHub Actions builds binaries and creates a release:

```bash
git tag v0.1.0
git push --tags
```

## License

MIT
