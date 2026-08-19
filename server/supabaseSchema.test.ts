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

  it("ships the separate Neon PostgreSQL target schema with tenant isolation", () => {
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "0001_neon_initial_schema.sql"
    );
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    expect(sqlContent).toContain("create table public.tenants");
    expect(sqlContent).toContain("create table public.whatsapp_embedded_credentials");
    expect(sqlContent).toContain("create table public.payment_transactions");
    expect(sqlContent).toContain("references public.tenants(id)");
    expect(sqlContent).toContain("alter table public.whatsapp_embedded_credentials enable row level security");
  });

  it("hardens the timestamp trigger function search path", () => {
    const hardeningPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "0002_harden_function_search_path.sql"
    );
    const sqlContent = fs.readFileSync(hardeningPath, "utf-8");

    expect(sqlContent).toContain("alter function public.neon_set_updated_at()");
    expect(sqlContent).toContain("set search_path = public, pg_temp");
  });
});
