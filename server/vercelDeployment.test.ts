import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

describe("Vercel deployment configuration", () => {
  it("uses the Vite client output and a single catch-all API function", () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
    expect(config.framework).toBeNull();
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.buildCommand).toBe("pnpm build:vercel");
    expect(config.functions["api/[...path].ts"].maxDuration).toBe(60);
  });

  it("adapts the shared Express app instead of binding a port inside Vercel", () => {
    const entry = fs.readFileSync(path.join(root, "api", "[...path].ts"), "utf8");
    expect(entry).toContain("createNeonApp");
    expect(entry).not.toContain("listen(");
  });
});
