import express from "express";
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { asyncRoute, independentErrorHandler } from "./asyncHandler";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("independent async route guards", () => {
  it("converts a rejected async route into a sanitized JSON 500", async () => {
    const app = express();
    app.get("/failing", asyncRoute(async () => {
      throw new Error("private database details");
    }));
    app.use(independentErrorHandler);
    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port");

    const response = await fetch(`http://127.0.0.1:${address.port}/failing`);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "تعذر إكمال الطلب الآن. حاول لاحقاً." });
  });
});
