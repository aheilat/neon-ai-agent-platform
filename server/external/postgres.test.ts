import { afterEach, describe, expect, it } from "vitest";
import { closeIndependentPostgresPool, getIndependentPostgresPool } from "./postgres";

const originalUrl = process.env.INDEPENDENT_DATABASE_URL;

afterEach(async () => {
  process.env.INDEPENDENT_DATABASE_URL = originalUrl;
  await closeIndependentPostgresPool();
});

describe("independent PostgreSQL connection gate", () => {
  it("does not fall back to the managed MySQL DATABASE_URL", () => {
    delete process.env.INDEPENDENT_DATABASE_URL;
    expect(getIndependentPostgresPool()).toBeUndefined();
  });
});
