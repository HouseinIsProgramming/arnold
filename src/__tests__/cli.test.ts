import { describe, test, expect } from "bun:test";
import { $ } from "bun";

const arnold = "bun run src/index.ts";

describe("CLI", () => {
  test("--version prints version", async () => {
    const result = await $`bun run src/index.ts --version`.text();
    expect(result.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("--help shows commands", async () => {
    const result = await $`bun run src/index.ts --help`.text();
    expect(result).toContain("schema");
    expect(result).toContain("auth");
    expect(result).toContain("exec");
  });

  test("schema ops requires --api", async () => {
    const result = await $`bun run src/index.ts schema ops 2>&1`.nothrow().text();
    expect(result).toContain("--api");
  });

  test("schema ops rejects invalid api", async () => {
    const result = await $`bun run src/index.ts schema ops --api invalid 2>&1`.nothrow().text();
    expect(result).toContain('must be "shop" or "admin"');
  });

  test("schema type rejects invalid api", async () => {
    const result = await $`bun run src/index.ts schema type --api nope SomeType 2>&1`.nothrow().text();
    expect(result).toContain('must be "shop" or "admin"');
  });

  test("exec rejects invalid api", async () => {
    const result = await $`bun run src/index.ts exec --api bad --query "{ me }" 2>&1`.nothrow().text();
    expect(result).toContain('must be "shop" or "admin"');
  });

  test("exec requires --query or --file", async () => {
    const result = await $`bun run src/index.ts exec --api shop 2>&1`.nothrow().text();
    expect(result).toContain("--query");
  });

  test("exec rejects invalid JSON variables", async () => {
    const result = await $`bun run src/index.ts exec --api shop --query "{ me }" --variables "not-json" 2>&1`.nothrow().text();
    expect(result).toContain("Invalid JSON");
  });

  test("auth status runs without error", async () => {
    const result = await $`bun run src/index.ts auth status 2>&1`.nothrow().text();
    expect(result).toContain("shop:");
    expect(result).toContain("admin:");
  });
});
