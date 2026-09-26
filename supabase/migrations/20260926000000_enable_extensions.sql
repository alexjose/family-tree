-- Extensions required by ARCHITECTURE.md §3.
-- Installed into the `extensions` schema to match Supabase-hosted projects, so that
-- schema-qualified references such as `extensions.gin_trgm_ops` behave identically
-- locally and in deployment.

create schema if not exists extensions;

-- Fuzzy and phonetic name matching for search (FEATURES.md §2.5).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- UUID and hashing helpers used by the domain schema.
create extension if not exists pgcrypto with schema extensions;

-- Scheduling and queueing (ADR-009). Both must live in the database named by
-- cron.database_name, which is `postgres` locally and on Supabase. The Supabase image
-- pre-installs them, so these are no-ops there.
create extension if not exists pg_cron;
create extension if not exists pgmq;
