/**
 * License policy for distributed artifacts. Pure functions only, so the policy can be
 * unit tested without invoking pnpm.
 */

/** SPDX identifiers permitted in production dependencies (FEATURES.md §13.1). */
export const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MIT-0",
  "PostgreSQL",
]);

/**
 * Packages cleared by a maintainer despite a license outside ALLOWED.
 * Adding an entry requires maintainer agreement per GOVERNANCE.md.
 *
 * - `postgres` (postgres.js) is Unlicense, a public-domain dedication. Permissive and
 *   compatible with Apache-2.0 redistribution, but with no patent grant, so it is
 *   approved by name rather than by widening the allowlist. Approved for #17.
 */
export const EXCEPTIONS = new Map([["postgres", "Unlicense"]]);

/** Splits an SPDX expression into its license identifiers and operator. */
export function parseExpression(expression) {
  const ids = expression
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((part) => part.trim().replace(/\+$/, ""))
    .filter(Boolean);
  return { ids, hasAnd: /\sAND\s/i.test(expression) };
}

// Under AND every license binds simultaneously, so all must be permissive. Under OR any
// single branch may be chosen. A mixed expression is treated as AND, which fails closed.
export function isAllowed(expression) {
  const { ids, hasAnd } = parseExpression(expression);
  if (ids.length === 0) return false;
  return hasAnd ? ids.every((id) => ALLOWED.has(id)) : ids.some((id) => ALLOWED.has(id));
}

/** Maps pnpm's `{ [license]: package[] }` output to a list of policy violations. */
export function findViolations(byLicense) {
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
  return violations;
}

/**
 * Parses `pnpm licenses list --json` output. Only pnpm's specific "nothing to check"
 * notice may pass; anything else unparseable means the gate did not run and must throw
 * rather than report a false pass.
 */
export function parsePnpmOutput(raw) {
  const text = raw.trim();
  if (text.startsWith("{")) return JSON.parse(text);
  if (/^No licenses in packages found/i.test(text)) return {};
  throw new Error(
    `Could not parse \`pnpm licenses list\` output. The license gate did not run.\n\n${text.slice(0, 500)}`,
  );
}
