# Arnold — GraphQL API Skill

## Using Arnold

Arnold is a CLI for discovering and executing GraphQL operations against a Vendure API.

### Discover operations
```bash
arnold schema ops --api shop                        # list all shop queries + mutations
arnold schema ops --api admin --filter order         # find order-related admin operations
arnold schema ops --api shop --filter notification   # find notification operations
```

### Inspect types
```bash
arnold schema type --api shop CreateNotificationInput  # see required fields
arnold schema type --api admin OrderFilterParameter     # see filter options
```

### Authenticate
```bash
arnold auth login --api shop --email user@example.com --password xxx
arnold auth login --api admin --email admin@example.com --password xxx
arnold auth status                                      # check active sessions
arnold auth logout --api shop                           # clear session
```

### Execute queries
```bash
arnold exec --api shop --query 'query { activeCustomer { id emailAddress } }'
arnold exec --api admin --query 'mutation { ... }' --variables '{"id": "1"}'
arnold exec --api shop --file ./my-query.graphql --variables '{"limit": 10}'
```

### Workflow
1. Use `arnold schema ops` to discover what operations are available
2. Use `arnold schema type` to understand input shapes and required fields
3. If you need IDs, customer context, or other values you don't have — ask the user
4. Use `arnold auth login` to authenticate (token is reused automatically)
5. Use `arnold exec` to run queries/mutations

### Tips
- Add `--json` to any command for machine-readable output
- Tokens are stored in `~/.arnold/` and reused across commands
- The shop API requires customer auth, the admin API requires admin auth

## For Plugin Developers

When creating or modifying a Vendure plugin, add a `CLAUDE.md` in the plugin root directory:

```
libs/shared/vendure-plugins/<plugin-name>/CLAUDE.md
```

### What to include

- **API Flow**: numbered steps for the primary use case (e.g., "1. auth as customer → 2. createOffer → 3. admin approves")
- **Auth requirements**: what permissions or roles are needed
- **Key gotchas**: non-obvious constraints, required state, side effects (e.g., "sends an email", "requires company-linked customer")

### What NOT to include

- Type definitions or field lists — the schema is the source of truth, use `arnold schema type` instead
- Endpoint URLs or auth config — that's in `.arnoldrc` or env vars

### Example

```markdown
# Offers Plugin

## API Flow
1. Auth as shop customer with `AccessOffers` permission
2. `createOffer` with productVariantId + quantities[]
3. Admin reviews: `updateOfferStatus(status: APPROVED)`
4. Customer sees it via `searchOffers`

## Auth
- Shop: customer must have `AccessOffers` permission assigned via company role
- Admin: requires `UpdateOffer` permission

## Gotchas
- Offers require a company-linked customer, not just any customer
- Price tiers are auto-calculated from quantity brackets
- Creating an offer emits `OfferCreatedEvent` (triggers notification email)
```
