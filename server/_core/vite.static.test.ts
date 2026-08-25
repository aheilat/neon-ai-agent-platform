import express from "express";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serveStatic } from "./vite";

describe("production static delivery", () => {
  it("does not return the SPA HTML fallback for a missing hashed asset and prevents stale HTML caching", async () => {
    const app = express();
    const distPath = path.resolve(import.meta.dirname, "../..", "dist", "public");
    await mkdir(distPath, { recursive: true });
    await writeFile(path.join(distPath, "index.html"), "<!doctype html><html><body><div id=\"root\"></div></body></html>");
    serveStatic(app);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP test server");
      const missingAsset = await fetch(`http://127.0.0.1:${address.port}/assets/index-no-longer-present.js`);
      const spaRoute = await fetch(`http://127.0.0.1:${address.port}/widget/10`);
      const unknownApi = await fetch(`http://127.0.0.1:${address.port}/api/unknown-route`);

      expect(missingAsset.status).toBe(404);
      expect(spaRoute.status).toBe(200);
      expect(spaRoute.headers.get("cache-control")).toContain("no-store");
      expect(spaRoute.headers.get("content-type")).toContain("text/html");
      expect(unknownApi.status).toBe(404);
      expect(unknownApi.headers.get("content-type")).toContain("application/json");
      expect(await unknownApi.json()).toEqual({ error: "API route not found" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await rm(path.resolve(import.meta.dirname, "../..", "dist"), { recursive: true, force: true });
    }
  });
});
