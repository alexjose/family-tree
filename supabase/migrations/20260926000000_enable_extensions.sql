-- Extensions required by ARCHITECTURE.md §3.
-- Supabase installs extensions into the `extensions` schema, which is on the search path.

-- Fuzzy and phonetic name matching for search (FEATURES.md §2.5).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- UUID and hashing helpers used by the domain schema.
create extension if not exists pgcrypto with schema extensions;

-- Scheduling and queueing (ADR-009). pg_cron must live in the database named by
-- cron.database_name, which is `postgres` both locally and on Supabase.
create extension if not exists pg_cron;
create extension if not exists pgmq;
