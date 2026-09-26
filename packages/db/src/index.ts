/** Drizzle schema, migrations, RLS policies, and repository implementations. */
export const DB_PACKAGE = "@family-tree/db" as const;

export {
  createClient,
  isTransactionPooler,
  readConfigFromEnv,
  DatabaseConfigError,
} from "./client.js";
export type { ConnectionMode, DatabaseClient, DatabaseConfig } from "./client.js";
