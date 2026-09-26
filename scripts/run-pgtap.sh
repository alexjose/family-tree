#!/usr/bin/env bash
# Applies migrations to a Postgres instance and runs the pgTAP suites.
# Usage: scripts/run-pgtap.sh [psql-connection-url]
set -euo pipefail

URL="${1:-${DATABASE_URL:-postgres://postgres:postgres@localhost:54322/postgres}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ applying migrations"
for file in "$ROOT"/supabase/migrations/*.sql; do
  echo "  $(basename "$file")"
  psql "$URL" -v ON_ERROR_STOP=1 -q -f "$file" >/dev/null
done

echo "→ running pgTAP suites"
failed=0
for file in "$ROOT"/supabase/tests/*.test.sql; do
  echo "  $(basename "$file")"
  output="$(psql "$URL" -q -f "$file" 2>&1)"

  if grep -qE "^ *not ok|ERROR:" <<<"$output"; then
    echo "$output" | grep -E "^ *not ok|ERROR:" || true
    failed=1
  fi

  grep -cE "^ ok [0-9]+ -" <<<"$output" | xargs -I{} echo "    {} assertions passed"
done

if [[ $failed -ne 0 ]]; then
  echo "✖ tenant isolation tests failed"
  exit 1
fi

echo "✔ all pgTAP suites passed"
