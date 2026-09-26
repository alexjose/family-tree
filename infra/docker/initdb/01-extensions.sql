-- Search, fuzzy matching, and crypto extensions required by ARCHITECTURE.md §3.
create extension if not exists pg_trgm;
create extension if not exists fuzzystrmatch;
create extension if not exists pgcrypto;

-- pg_cron and pgmq are enabled with the queue/scheduling work, not here: this image
-- installs them under supabase_admin and they need cron.database_name configured first.
