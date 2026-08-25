import { describe, expect, it } from "vitest";

describe("public app title configuration", () => {
  it("is accepted alongside the independent health endpoint", async () => {
    const title = process.env.VITE_APP_TITLE;
    expect(title).toBe("Neon AI Agents");
    const response = await fetch("https://agent.neonadai.com/api/health", { headers: { "X-Neon-App-Title": title } });
    expect(response.status).toBeLessThan(500);
  }, 15000);

  it("keeps the configured public title stable for the public entry point", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Neon AI Agents");
  });
});
