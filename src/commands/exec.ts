import { Command } from "commander";
import { readFileSync } from "fs";
import { loadConfig, getApiUrl, validateApi } from "../lib/config.ts";
import { executeGraphQL } from "../lib/client.ts";

export const execCommand = new Command("exec")
  .description("Execute a GraphQL query or mutation")
  .requiredOption("--api <api>", "API to execute against (shop or admin)")
  .option("--query <query>", "Inline GraphQL query")
  .option("--file <path>", "Path to .graphql file")
  .option("--variables <json>", "JSON variables", "{}")
  .option("--json", "Raw JSON output (default is pretty-printed)")
  .action(async (opts) => {
    validateApi(opts.api);
    if (!opts.query && !opts.file) {
      console.error("Provide either --query or --file");
      process.exit(1);
    }

    const query = opts.file
      ? readFileSync(opts.file, "utf-8")
      : opts.query!;

    let variables: Record<string, unknown>;
    try {
      variables = JSON.parse(opts.variables);
    } catch {
      console.error("Invalid JSON in --variables");
      process.exit(1);
    }

    const config = loadConfig();
    const url = getApiUrl(opts.api, config);
    const result = await executeGraphQL(url, query, variables, { api: opts.api });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.errors) {
        console.error("\nErrors:\n");
        for (const err of result.errors) {
          console.error(`  ${err.message}`);
          if (err.path) console.error(`    at ${err.path.join(".")}`);
        }
      }
      if (result.data) {
        console.log("\nData:\n");
        console.log(JSON.stringify(result.data, null, 2));
      }
    }

    if (result.errors && !result.data) process.exit(1);
  });
