#!/usr/bin/env bun
import { Command } from "commander";
import { schemaCommand } from "./commands/schema.ts";
import { authCommand } from "./commands/auth.ts";
import { execCommand } from "./commands/exec.ts";
import { setCliOverrides } from "./lib/config.ts";

const program = new Command();

program
  .name("arnold")
  .description("Agent-first GraphQL API CLI")
  .version("0.2.0")
  .exitOverride()
  .option("--port <port>", "Vendure server port (overrides PORT env and .arnoldrc)")
  .option("--shop-api <url>", "Shop API URL (overrides all other config)")
  .option("--admin-api <url>", "Admin API URL (overrides all other config)")
  .hook("preSubcommand", () => {
    const opts = program.opts();
    setCliOverrides({
      port: opts.port,
      shopApi: opts.shopApi,
      adminApi: opts.adminApi,
    });
  });

program.addCommand(schemaCommand);
program.addCommand(authCommand);
program.addCommand(execCommand);

try {
  await program.parseAsync();
} catch (err: any) {
  // Commander throws on --help / --version with code 'commander.helpDisplayed'
  if (err?.code?.startsWith("commander.")) process.exit(0);
  console.error(err.message);
  process.exit(1);
}
