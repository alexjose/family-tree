import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DatabaseConfigError,
  isTransactionPooler,
  readConfigFromEnv,
} from "../../packages/db/dist/index.js";

describe("isTransactionPooler", () => {
  it("recognises Supavisor transaction-mode URLs", () => {
    assert.equal(
      isTransactionPooler(
        "postgresql://postgres.ref:pw@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
      ),
      true,
    );
  });

  it("rejects a direct Supabase connection on 5432", () => {
    assert.equal(
      isTransactionPooler("postgresql://postgres:pw@db.ref.supabase.co:5432/postgres"),
      false,
    );
  });

  it("rejects a plain local connection", () => {
    assert.equal(
      isTransactionPooler("postgres://postgres:postgres@localhost:54322/postgres"),
      false,
    );
  });
});

describe("readConfigFromEnv", () => {
  it("reads the pooled URL, direct URL, and pool size", () => {
    const config = readConfigFromEnv({
      DATABASE_URL: "postgres://localhost:6543/postgres",
      DIRECT_URL: "postgres://localhost:5432/postgres",
      DATABASE_MAX_CONNECTIONS: "7",
    });
    assert.equal(config.url, "postgres://localhost:6543/postgres");
    assert.equal(config.directUrl, "postgres://localhost:5432/postgres");
    assert.equal(config.max, 7);
  });

  it("leaves the direct URL and pool size unset when absent", () => {
    const config = readConfigFromEnv({ DATABASE_URL: "postgres://localhost/postgres" });
    assert.equal(config.directUrl, undefined);
    assert.equal(config.max, undefined);
  });

  // Failing loudly beats connecting to something unintended.
  it("throws a typed error when DATABASE_URL is missing or blank", () => {
    assert.throws(() => readConfigFromEnv({}), DatabaseConfigError);
    assert.throws(() => readConfigFromEnv({ DATABASE_URL: "   " }), DatabaseConfigError);
  });
});
