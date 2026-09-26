import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Complements the ESLint rule in eslint.config.mjs. Lint governs source imports; this
 * governs the manifest, so a dependency cannot be reintroduced through package.json.
 */
const corePackage = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../packages/core/package.json", import.meta.url)),
    "utf8",
  ),
);

describe("packages/core boundary", () => {
  it("declares no runtime dependencies", () => {
    assert.deepEqual(corePackage.dependencies ?? {}, {});
  });

  it("declares no peer or optional dependencies", () => {
    assert.deepEqual(corePackage.peerDependencies ?? {}, {});
    assert.deepEqual(corePackage.optionalDependencies ?? {}, {});
  });

  // Zero dependencies is what lets core's tests run with no database and no network.
  it("is therefore runnable without a database or network", () => {
    const all = {
      ...(corePackage.dependencies ?? {}),
      ...(corePackage.peerDependencies ?? {}),
      ...(corePackage.optionalDependencies ?? {}),
    };
    assert.equal(Object.keys(all).length, 0);
  });
});
