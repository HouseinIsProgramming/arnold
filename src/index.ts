#!/usr/bin/env bun
import { Command } from "commander";
import { schemaCommand } from "./commands/schema.ts";
import { authCommand } from "./commands/auth.ts";
import { execCommand } from "./commands/exec.ts";

const program = new Command();

program
  .name("arnold")
  .description("Agent-first GraphQL API CLI")
  .version("0.1.0")
  .exitOverride();

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
