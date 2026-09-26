#!/usr/bin/env node
/**
 * Fails when a production dependency carries a license incompatible with Apache-2.0
 * redistribution. Dev dependencies are exempt because they are never bundled.
 */
import { execFileSync } from "node:child_process";
import { findViolations, parsePnpmOutput } from "./lib/license-policy.mjs";

// Dev dependencies are auditable on demand but never block, since they are not shipped.
const includeDev = process.argv.includes("--include-dev");

function readLicenses() {
  const args = ["licenses", "list", "--json"];
  if (!includeDev) args.push("--prod");
  const raw = execFileSync("pnpm", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return parsePnpmOutput(raw);
}

let byLicense;
try {
  byLicense = readLicenses();
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exit(1);
}

const violations = findViolations(byLicense);

if (violations.length > 0) {
  console.error("✖ Incompatible dependency licenses:\n");
  for (const v of violations) {
    console.error(`  ${v.name}@${v.versions} — ${v.license}`);
  }
  if (includeDev) {
    console.error("\n(--include-dev: dev-only tooling does not block a release.)");
    process.exit(0);
  }
  console.error(
    "\nDistributed artifacts must be Apache-2.0 compatible (Apache-2.0, MIT, BSD, ISC).",
  );
  console.error(
    "Replace the dependency, move it to devDependencies, or ask a maintainer",
  );
  console.error("to record an exception in scripts/lib/license-policy.mjs.\n");
  process.exit(1);
}

const count = Object.values(byLicense).reduce((n, pkgs) => n + pkgs.length, 0);
const scope = includeDev ? "dependencies" : "production dependencies";
console.log(`✔ ${count} ${scope} checked — all Apache-2.0 compatible.`);
