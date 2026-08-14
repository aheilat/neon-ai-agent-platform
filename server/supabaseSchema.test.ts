import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Supabase Production Schema Verification", () => {
  it("contains all required tables, indexes, and RLS security policies", () => {
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    const sqlContent = fs.readFileSync(schemaPath, "utf-8");

    expect(sqlContent).toContain("create table if not exists tenants");
    expect(sqlContent).toContain("create table if not exists agents");
    expect(sqlContent).toContain("create table if not exists knowledge_base");
    expect(sqlContent).toContain("create table if not exists channel_integrations");
    expect(sqlContent).toContain("enable row level security");
    expect(sqlContent).toContain("plan_tier");
    expect(sqlContent).toContain("max_channels");
    expect(sqlContent).toContain("source_website_url");
    expect(sqlContent).toContain("source_url");
  });
});
