import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { loadConfig, getApiUrl, getSessionDir } from "../lib/config.ts";
import { executeGraphQL } from "../lib/client.ts";
import { join } from "path";

export const authCommand = new Command("auth").description(
  "Authenticate against a Vendure GraphQL API"
);

authCommand
  .command("login")
  .description("Authenticate and store session token")
  .requiredOption("--api <api>", "API to authenticate against (shop or admin)")
  .requiredOption("--email <email>", "Email address")
  .requiredOption("--password <password>", "Password")
  .action(async (opts) => {
    const config = loadConfig();
    const url = getApiUrl(opts.api, config);

    const query =
      opts.api === "admin"
        ? `mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
              ... on CurrentUser { id identifier }
              ... on InvalidCredentialsError { message }
              ... on NativeAuthenticationError { message }
            }
          }`
        : `mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
              ... on CurrentUser { id identifier }
              ... on InvalidCredentialsError { message }
              ... on NativeAuthenticationError { message }
              ... on NotVerifiedError { message }
            }
          }`;

    // Use raw fetch to capture the auth token from response headers
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { username: opts.email, password: opts.password },
      }),
    });

    const json = (await response.json()) as any;

    if (json.errors) {
      console.error("Auth failed:", json.errors[0]?.message);
      process.exit(1);
    }

    const result = json.data?.login;
    if (result?.message) {
      console.error(`Auth failed: ${result.message}`);
      process.exit(1);
    }

    // Vendure returns the token in the response header
    const token = response.headers.get("vendure-auth-token");
    if (!token) {
      console.error("No auth token in response. Check API configuration (tokenMethod must include 'bearer').");
      process.exit(1);
    }

    const sessionDir = getSessionDir();
    if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, `${opts.api}.token`), token);

    console.log(`Authenticated as ${result.identifier} (${opts.api} API)`);
    console.log(`Token stored in ~/.arnold/${opts.api}.token`);
  });

authCommand
  .command("logout")
  .description("Clear stored session token")
  .requiredOption("--api <api>", "API to clear session for (shop or admin)")
  .action((opts) => {
    const tokenFile = join(getSessionDir(), `${opts.api}.token`);
    if (existsSync(tokenFile)) {
      unlinkSync(tokenFile);
      console.log(`Session cleared for ${opts.api} API`);
    } else {
      console.log(`No session found for ${opts.api} API`);
    }
  });

authCommand
  .command("status")
  .description("Check current auth status")
  .option("--api <api>", "Check specific API (shop or admin)")
  .action(async (opts) => {
    const apis = opts.api ? [opts.api] : ["shop", "admin"];
    const config = loadConfig();

    for (const api of apis) {
      const tokenFile = join(getSessionDir(), `${api}.token`);
      if (!existsSync(tokenFile)) {
        console.log(`${api}: not authenticated`);
        continue;
      }

      const url = getApiUrl(api as "shop" | "admin", config);
      const query =
        api === "admin"
          ? `query { me { id identifier } }`
          : `query { activeCustomer { id emailAddress } }`;

      const result = await executeGraphQL(url, query, undefined, { api });
      const user = result.data?.me ?? result.data?.activeCustomer;

      if (user) {
        console.log(`${api}: authenticated as ${(user as any).identifier ?? (user as any).emailAddress}`);
      } else {
        console.log(`${api}: token stored but session may be expired`);
      }
    }
  });
