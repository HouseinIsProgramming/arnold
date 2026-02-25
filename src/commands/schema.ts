import { Command } from "commander";
import { loadConfig, getApiUrl } from "../lib/config.ts";
import { listOperations, describeType } from "../lib/introspect.ts";

export const schemaCommand = new Command("schema").description(
  "Discover GraphQL schema via introspection"
);

schemaCommand
  .command("ops")
  .description("List queries and mutations")
  .requiredOption("--api <api>", "API to introspect (shop or admin)")
  .option("--filter <keyword>", "Filter operations by keyword")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const config = loadConfig();
    const url = getApiUrl(opts.api, config);
    const { queries, mutations } = await listOperations(url, opts.filter, undefined, opts.api);

    if (opts.json) {
      console.log(JSON.stringify({ queries, mutations }, null, 2));
      return;
    }

    if (queries.length > 0) {
      console.log(`\nQueries (${queries.length}):\n`);
      for (const q of queries) {
        const args = q.args.length > 0
          ? `(${q.args.map((a) => `${a.name}: ${a.type}`).join(", ")})`
          : "";
        const desc = q.description ? ` — ${q.description}` : "";
        console.log(`  ${q.name}${args} → ${q.returnType}${desc}`);
      }
    }

    if (mutations.length > 0) {
      console.log(`\nMutations (${mutations.length}):\n`);
      for (const m of mutations) {
        const args = m.args.length > 0
          ? `(${m.args.map((a) => `${a.name}: ${a.type}`).join(", ")})`
          : "";
        const desc = m.description ? ` — ${m.description}` : "";
        console.log(`  ${m.name}${args} → ${m.returnType}${desc}`);
      }
    }

    if (queries.length === 0 && mutations.length === 0) {
      console.log(opts.filter ? `No operations matching "${opts.filter}"` : "No operations found");
    }
  });

schemaCommand
  .command("type")
  .description("Describe a specific GraphQL type")
  .requiredOption("--api <api>", "API to introspect (shop or admin)")
  .argument("<typeName>", "Name of the type to describe")
  .option("--json", "Output as JSON")
  .action(async (typeName, opts) => {
    const config = loadConfig();
    const url = getApiUrl(opts.api, config);
    const typeInfo = await describeType(url, typeName, undefined, opts.api);

    if (opts.json) {
      console.log(JSON.stringify(typeInfo, null, 2));
      return;
    }

    console.log(`\n${typeInfo.kind}: ${typeInfo.name}`);
    if (typeInfo.description) console.log(`  ${typeInfo.description}`);

    const fields = typeInfo.fields ?? typeInfo.inputFields;
    if (fields && fields.length > 0) {
      console.log(`\n  Fields:\n`);
      for (const f of fields) {
        const req = f.isRequired ? " (required)" : "";
        const desc = f.description ? ` — ${f.description}` : "";
        console.log(`    ${f.name}: ${f.type}${req}${desc}`);
      }
    }

    if (typeInfo.enumValues) {
      console.log(`\n  Values:\n`);
      for (const v of typeInfo.enumValues) {
        console.log(`    ${v}`);
      }
    }

    console.log();
  });
