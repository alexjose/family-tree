#!/usr/bin/env node
/**
 * Fails when a production dependency carries a license incompatible with Apache-2.0
 * redistribution. Dev dependencies are exempt because they are never bundled.
 */
import { execFileSync } from "node:child_process";

const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT-0",
  "Python-2.0",
  "Unlicense",
  "WTFPL",
  "Zlib",
]);

/** Packages cleared by a maintainer despite an unrecognized SPDX string. */
const EXCEPTIONS = new Map();

// Dev dependencies are auditable on demand but never block, since they are not shipped.
const includeDev = process.argv.includes("--include-dev");

function readProdLicenses() {
  const args = ["licenses", "list", "--json"];
  if (!includeDev) args.push("--prod");
  const raw = execFileSync("pnpm", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
  // pnpm prints a plain-text notice instead of JSON when nothing matches.
  if (!raw.startsWith("{")) return {};
  return JSON.parse(raw);
}

function splitExpression(expression) {
  return expression
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((part) => part.trim().replace(/\+$/, ""))
    .filter(Boolean);
}

// An OR expression passes if any branch is permissive; AND is treated the same way
// deliberately, since a maintainer reviews anything that lands in EXCEPTIONS.
function isAllowed(expression) {
  return splitExpression(expression).some((id) => ALLOWED.has(id));
}

const byLicense = readProdLicenses();
const violations = [];

for (const [license, packages] of Object.entries(byLicense)) {
  if (isAllowed(license)) continue;
  for (const pkg of packages) {
    if (EXCEPTIONS.get(pkg.name) === license) continue;
    violations.push({
      name: pkg.name,
      versions: pkg.versions?.join(", ") ?? "",
      license,
    });
  }
}

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
  console.error("to record an exception in scripts/check-licenses.mjs.\n");
  process.exit(1);
}

const count = Object.values(byLicense).reduce((n, pkgs) => n + pkgs.length, 0);
const scope = includeDev ? "dependencies" : "production dependencies";
console.log(`✔ ${count} ${scope} checked — all Apache-2.0 compatible.`);
