#!/usr/bin/env node
/**
 * Verifies that concurrent requests do not exhaust Postgres connections
 * (issue #17 acceptance criterion).
 *
 * Usage: node scripts/db-load-test.mjs [requests]
 * Requires DATABASE_URL. Run against local Postgres or a Supavisor pooled URL.
 */
import postgres from "postgres";

const REQUESTS = Number(process.argv[2] ?? 100);
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("✖ DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(2);
}

// Mirrors packages/db defaults: a small socket pool shared by many concurrent requests.
const sql = postgres(url, {
  prepare: false,
  max: Number(process.env.DATABASE_MAX_CONNECTIONS ?? 5),
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

const started = Date.now();

try {
  const results = await Promise.allSettled(
    Array.from({ length: REQUESTS }, async (_, i) => {
      const [row] = await sql`select ${i}::int as n, pg_backend_pid() as pid`;
      return row;
    }),
  );

  const failures = results.filter((r) => r.status === "rejected");
  const backends = new Set(
    results.filter((r) => r.status === "fulfilled").map((r) => r.value.pid),
  );

  const [{ used, limit }] = await sql`
    select (select count(*) from pg_stat_activity)::int as used,
           current_setting('max_connections')::int as limit
  `;

  console.log(`requests:          ${REQUESTS}`);
  console.log(`failed:            ${failures.length}`);
  console.log(`distinct backends: ${backends.size}`);
  console.log(`server conns:      ${used}/${limit}`);
  console.log(`duration:          ${Date.now() - started}ms`);

  if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} request(s) failed:`);
    console.error(`  ${failures[0].reason?.message ?? failures[0].reason}`);
    process.exit(1);
  }

  if (used >= limit) {
    console.error("\n✖ Connection limit reached.");
    process.exit(1);
  }

  console.log(
    `\n✔ ${REQUESTS} concurrent requests served without exhausting connections.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
