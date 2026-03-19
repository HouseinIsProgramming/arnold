import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

export interface ArnoldConfig {
  shopApi: string;
  adminApi: string;
}

/** CLI overrides set via global --port / --shop-api / --admin-api flags */
export interface CliOverrides {
  port?: string;
  shopApi?: string;
  adminApi?: string;
}

let _cliOverrides: CliOverrides = {};

export function setCliOverrides(overrides: CliOverrides) {
  _cliOverrides = overrides;
}

function findRcFile(): string | null {
  // 1. Walk up from cwd
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, ".arnoldrc");
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // 2. Global fallback: ~/.arnoldrc
  const globalRc = join(homedir(), ".arnoldrc");
  if (existsSync(globalRc)) return globalRc;
  return null;
}

export function parseRcFile(path: string): Partial<ArnoldConfig> {
  const content = readFileSync(path, "utf-8");
  const config: Partial<ArnoldConfig> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();
    if (key === "ARNOLD_SHOP_API") config.shopApi = value;
    if (key === "ARNOLD_ADMIN_API") config.adminApi = value;
  }
  return config;
}

// Priority: CLI flags > env vars > .arnoldrc > PORT env > localhost:3000
function resolveBaseUrl(): string {
  const port = _cliOverrides.port ?? process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

export function loadConfig(): ArnoldConfig {
  const rcFile = findRcFile();
  const rcConfig = rcFile ? parseRcFile(rcFile) : {};
  const baseUrl = resolveBaseUrl();

  return {
    shopApi:
      _cliOverrides.shopApi ??
      process.env.ARNOLD_SHOP_API ??
      rcConfig.shopApi ??
      `${baseUrl}/shop-api`,
    adminApi:
      _cliOverrides.adminApi ??
      process.env.ARNOLD_ADMIN_API ??
      rcConfig.adminApi ??
      `${baseUrl}/admin-api`,
  };
}

export function validateApi(api: string): asserts api is "shop" | "admin" {
  if (api !== "shop" && api !== "admin") {
    throw new Error(`Invalid API "${api}" — must be "shop" or "admin"`);
  }
}

export function getApiUrl(api: "shop" | "admin", config: ArnoldConfig): string {
  return api === "shop" ? config.shopApi : config.adminApi;
}

export function getSessionDir(): string {
  const dir = join(homedir(), ".arnold");
  return dir;
}
