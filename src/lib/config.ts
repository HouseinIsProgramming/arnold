import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

export interface ArnoldConfig {
  shopApi: string;
  adminApi: string;
}

const DEFAULT_CONFIG: ArnoldConfig = {
  shopApi: "http://localhost:3000/shop-api",
  adminApi: "http://localhost:3000/admin-api",
};

function findRcFile(): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, ".arnoldrc");
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseRcFile(path: string): Partial<ArnoldConfig> {
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

export function loadConfig(): ArnoldConfig {
  const rcFile = findRcFile();
  const rcConfig = rcFile ? parseRcFile(rcFile) : {};

  return {
    shopApi:
      process.env.ARNOLD_SHOP_API ?? rcConfig.shopApi ?? DEFAULT_CONFIG.shopApi,
    adminApi:
      process.env.ARNOLD_ADMIN_API ??
      rcConfig.adminApi ??
      DEFAULT_CONFIG.adminApi,
  };
}

export function getApiUrl(api: "shop" | "admin", config: ArnoldConfig): string {
  return api === "shop" ? config.shopApi : config.adminApi;
}

export function getSessionDir(): string {
  const dir = join(homedir(), ".arnold");
  return dir;
}
