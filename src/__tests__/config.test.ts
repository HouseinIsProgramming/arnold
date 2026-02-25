import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadConfig,
  validateApi,
  getApiUrl,
  parseRcFile,
} from "../lib/config.ts";

describe("validateApi", () => {
  test("accepts 'shop'", () => {
    expect(() => validateApi("shop")).not.toThrow();
  });

  test("accepts 'admin'", () => {
    expect(() => validateApi("admin")).not.toThrow();
  });

  test("rejects invalid api", () => {
    expect(() => validateApi("shoop")).toThrow('must be "shop" or "admin"');
  });

  test("rejects empty string", () => {
    expect(() => validateApi("")).toThrow('must be "shop" or "admin"');
  });
});

describe("getApiUrl", () => {
  test("returns shop url", () => {
    const config = { shopApi: "http://localhost:3000/shop-api", adminApi: "http://localhost:3000/admin-api" };
    expect(getApiUrl("shop", config)).toBe("http://localhost:3000/shop-api");
  });

  test("returns admin url", () => {
    const config = { shopApi: "http://localhost:3000/shop-api", adminApi: "http://localhost:3000/admin-api" };
    expect(getApiUrl("admin", config)).toBe("http://localhost:3000/admin-api");
  });
});

describe("parseRcFile", () => {
  const tmpDir = join(tmpdir(), "arnold-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("parses shop and admin urls", () => {
    const rcPath = join(tmpDir, ".arnoldrc");
    writeFileSync(rcPath, "ARNOLD_SHOP_API=http://staging:4000/shop-api\nARNOLD_ADMIN_API=http://staging:4000/admin-api");
    expect(parseRcFile(rcPath)).toEqual({
      shopApi: "http://staging:4000/shop-api",
      adminApi: "http://staging:4000/admin-api",
    });
  });

  test("ignores comments and blank lines", () => {
    const rcPath = join(tmpDir, ".arnoldrc");
    writeFileSync(rcPath, "# This is a comment\n\nARNOLD_SHOP_API=http://localhost:5000/shop-api\n# Another comment");
    expect(parseRcFile(rcPath)).toEqual({ shopApi: "http://localhost:5000/shop-api" });
  });

  test("handles urls with = in value", () => {
    const rcPath = join(tmpDir, ".arnoldrc");
    writeFileSync(rcPath, "ARNOLD_SHOP_API=http://host:3000/shop-api?token=abc=123");
    expect(parseRcFile(rcPath)).toEqual({ shopApi: "http://host:3000/shop-api?token=abc=123" });
  });

  test("returns empty for unrecognized keys", () => {
    const rcPath = join(tmpDir, ".arnoldrc");
    writeFileSync(rcPath, "SOME_OTHER_KEY=value");
    expect(parseRcFile(rcPath)).toEqual({});
  });
});

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    delete process.env.ARNOLD_SHOP_API;
    delete process.env.ARNOLD_ADMIN_API;
    delete process.env.PORT;
  });

  test("defaults to localhost:3000", () => {
    delete process.env.ARNOLD_SHOP_API;
    delete process.env.ARNOLD_ADMIN_API;
    delete process.env.PORT;
    const config = loadConfig();
    expect(config.shopApi).toBe("http://localhost:3000/shop-api");
    expect(config.adminApi).toBe("http://localhost:3000/admin-api");
  });

  test("respects PORT env var", () => {
    delete process.env.ARNOLD_SHOP_API;
    delete process.env.ARNOLD_ADMIN_API;
    process.env.PORT = "4000";
    const config = loadConfig();
    expect(config.shopApi).toBe("http://localhost:4000/shop-api");
    expect(config.adminApi).toBe("http://localhost:4000/admin-api");
  });

  test("ARNOLD env vars take precedence over PORT", () => {
    process.env.PORT = "4000";
    process.env.ARNOLD_SHOP_API = "http://custom:9000/shop";
    const config = loadConfig();
    expect(config.shopApi).toBe("http://custom:9000/shop");
    expect(config.adminApi).toBe("http://localhost:4000/admin-api");
  });
});
