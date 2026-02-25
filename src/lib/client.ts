import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getSessionDir } from "./config.ts";

interface GraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string; path?: string[]; extensions?: unknown }>;
}

export interface ExecResult {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string; path?: string[]; extensions?: unknown }>;
  status: number;
}

function getStoredToken(api: string): string | null {
  const sessionFile = join(getSessionDir(), `${api}.token`);
  if (!existsSync(sessionFile)) return null;
  return readFileSync(sessionFile, "utf-8").trim();
}

export async function executeGraphQL(
  url: string,
  query: string,
  variables?: Record<string, unknown>,
  options?: { token?: string; api?: string }
): Promise<ExecResult> {
  const token = options?.token ?? (options?.api ? getStoredToken(options.api) : null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const json = (await response.json()) as GraphQLResponse;

  return {
    data: json.data,
    errors: json.errors,
    status: response.status,
  };
}
