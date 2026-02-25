#!/usr/bin/env bun
import { Command } from "commander";
import { schemaCommand } from "./commands/schema.ts";
import { authCommand } from "./commands/auth.ts";
import { execCommand } from "./commands/exec.ts";

const program = new Command();

program
  .name("arnold")
  .description("Agent-first GraphQL API CLI")
  .version("0.1.0");

program.addCommand(schemaCommand);
program.addCommand(authCommand);
program.addCommand(execCommand);

program.parse();
