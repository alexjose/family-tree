import postgres from "postgres";

/**
 * Two connections, deliberately separate (ADR-002, ARCHITECTURE.md §3.4):
 *
 * - `sql` goes through Supavisor in **transaction mode** (port 6543). Serverless instances
 *   are short-lived and numerous, so pooling is what stops us exhausting Postgres
 *   connections. Prepared statements are unavailable in this mode.
 * - `directSql` is a direct connection (port 5432) used only by migrations, which need
 *   session-level features the transaction pooler does not support.
 */

export type ConnectionMode = "pooled" | "direct";

export interface DatabaseConfig {
  /** Supavisor transaction-mode URL. */
  url: string;
  /** Direct connection URL, migrations only. */
  directUrl?: string | undefined;
  /** Maximum sockets per instance. Keep small: many instances share one pooler. */
  max?: number | undefined;
  idleTimeoutSeconds?: number | undefined;
  connectTimeoutSeconds?: number | undefined;
}

export class DatabaseConfigError extends Error {}

function requireUrl(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === "") {
    throw new DatabaseConfigError(
      `${name} is not set. Copy .env.example to .env, or set it as a deployment secret.`,
    );
  }
  return value;
}

export function readConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    url: requireUrl(env["DATABASE_URL"], "DATABASE_URL"),
    directUrl: env["DIRECT_URL"],
    max: env["DATABASE_MAX_CONNECTIONS"]
      ? Number(env["DATABASE_MAX_CONNECTIONS"])
      : undefined,
  };
}

/**
 * True when the URL points at Supavisor's transaction-mode endpoint.
 * Parses the URL rather than substring-matching it, so a host such as
 * `evil.com/?x=pooler.supabase.com` cannot pass as the pooler.
 */
export function isTransactionPooler(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.port === "6543") return true;

  const host = parsed.hostname.toLowerCase();
  return host === "pooler.supabase.com" || host.endsWith(".pooler.supabase.com");
}

export function createClient(config: DatabaseConfig, mode: ConnectionMode = "pooled") {
  const url =
    mode === "direct"
      ? requireUrl(config.directUrl, "DIRECT_URL")
      : requireUrl(config.url, "DATABASE_URL");

  if (mode === "pooled" && !isTransactionPooler(url)) {
    // Not fatal locally, where a plain Postgres is used, but wrong in deployment.
    process.emitWarning(
      "DATABASE_URL does not look like a Supavisor transaction-mode URL (port 6543). " +
        "Serverless deployments will exhaust Postgres connections without it.",
      "DatabaseConfigWarning",
    );
  }

  return postgres(url, {
    // Transaction pooling cannot carry prepared statements across checkouts.
    prepare: mode === "direct",
    max: config.max ?? (mode === "direct" ? 1 : 5),
    idle_timeout: config.idleTimeoutSeconds ?? 20,
    connect_timeout: config.connectTimeoutSeconds ?? 10,
    onnotice: () => {},
  });
}

export type DatabaseClient = ReturnType<typeof createClient>;
