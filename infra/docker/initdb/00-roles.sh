#!/bin/bash
# Supabase-hosted projects connect as `postgres`; this image bootstraps as supabase_admin.
# Creating the role locally keeps connection strings identical across environments.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=pw="$POSTGRES_PASSWORD" <<-'EOSQL'
	select format('create role postgres login superuser password %L', :'pw')
	where not exists (select 1 from pg_roles where rolname = 'postgres') \gexec
EOSQL
