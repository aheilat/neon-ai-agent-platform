import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("Render staging deployment configuration", () => {
  it("keeps the staging service manual and prompts securely for external secrets", () => {
    const blueprint = fs.readFileSync(path.join(root, "render.yaml"), "utf8");

    expect(blueprint).toContain("runtime: node");
    expect(blueprint).toContain("buildCommand: pnpm install --frozen-lockfile && pnpm build");
    expect(blueprint).toContain("startCommand: pnpm start");
    expect(blueprint).toContain("autoDeployTrigger: off");
    expect(blueprint).toContain("healthCheckPath: /api/health");
    expect(blueprint).toContain("key: INDEPENDENT_DATABASE_URL\n        sync: false");
    expect(blueprint).toContain("key: SUPABASE_URL\n        sync: false");
    expect(blueprint).toContain("key: SUPABASE_SERVICE_ROLE_KEY\n        sync: false");
    expect(blueprint).toContain("key: VITE_SUPABASE_URL\n        sync: false");
    expect(blueprint).toContain("key: VITE_SUPABASE_PUBLISHABLE_KEY\n        sync: false");
    expect(blueprint).toContain("key: ANTHROPIC_API_KEY\n        sync: false");
    expect(blueprint).toContain("key: ANTHROPIC_MODEL\n        value: claude-haiku-4-5");
    expect(blueprint).not.toContain("key: DATABASE_URL");
    expect(blueprint).not.toContain("key: OAUTH_SERVER_URL");
    expect(blueprint).not.toContain("key: BUILT_IN_FORGE_API_KEY");
    expect(blueprint).not.toMatch(/(mysql|postgres):\/\/[^\s]+/i);
  });

  it("binds the Express production service to the host-provided PORT", () => {
    const entrypoint = fs.readFileSync(path.join(root, "server", "_core", "index.ts"), "utf8");
    expect(entrypoint).toContain('process.env.PORT || "3000"');
    expect(entrypoint).toContain("server.listen(port");
  });
});
