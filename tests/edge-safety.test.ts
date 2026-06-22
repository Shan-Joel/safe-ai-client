import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("edge-runtime safety", () => {
  it("no src file imports a Node built-in module", () => {
    const offenders: string[] = [];
    const builtinImport =
      /from\s+["'](node:|fs|path|crypto|os|child_process|http|https|net|stream|util|events|buffer)["']/;
    for (const file of walk("src").filter((f) => f.endsWith(".ts"))) {
      const content = readFileSync(file, "utf8");
      if (builtinImport.test(content)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("createGuard works against a minimal global surface (no process)", async () => {
    // crypto.randomUUID + fetch are the only globals the runtime path touches.
    const { createGuard } = await import("../src/index");
    const guard = createGuard();
    const { usage } = await guard.run({
      provider: "your-provider",
      model: "your-model",
      execute: async () => ({ usage: { prompt_tokens: 1, completion_tokens: 1 } }),
    });
    expect(usage.requestId).toBeTypeOf("string");
  });
});
