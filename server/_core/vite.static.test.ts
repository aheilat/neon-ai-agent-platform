import express from "express";
import { describe, expect, it } from "vitest";
import { serveStatic } from "./vite";

describe("production static delivery", () => {
  it("does not return the SPA HTML fallback for a missing hashed asset and prevents stale HTML caching", async () => {
    const app = express();
    serveStatic(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const missingAsset = await fetch(`http://127.0.0.1:${address.port}/assets/index-no-longer-present.js`);
      const spaRoute = await fetch(`http://127.0.0.1:${address.port}/widget/10`);

      expect(missingAsset.status).toBe(404);
      expect(spaRoute.status).toBe(200);
      expect(spaRoute.headers.get("cache-control")).toContain("no-store");
      expect(spaRoute.headers.get("content-type")).toContain("text/html");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
