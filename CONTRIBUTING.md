# Contributing

Thanks for helping build this. Family history software lives or dies on its community,
so contributions of every kind matter — not only code.

## Ways to contribute

| Kind                | Examples                                                   |
| ------------------- | ---------------------------------------------------------- |
| Code                | Features, bug fixes, tests, performance                    |
| Design              | UI, accessibility review, illustration                     |
| Translation         | UI strings, regional date and name conventions             |
| Documentation       | Guides, self-hosting instructions, examples                |
| Genealogy expertise | GEDCOM edge cases, cultural naming and kinship models      |
| Testing             | Trying the app with your own family and reporting friction |

Usability feedback from non-technical and older users is especially valuable. If a
relative got stuck, that is a bug — please report it.

## Development setup

Requires **Node 22.18+** and **pnpm 10**. Use corepack; do not install pnpm globally, and
never use `npm` or `yarn` in this repo.

```bash
corepack enable pnpm
pnpm install
pnpm build
```

### Commands

| Command                             | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `pnpm build`                        | Build all workspaces                    |
| `pnpm typecheck`                    | Type-check without emitting             |
| `pnpm lint`                         | ESLint across all workspaces            |
| `pnpm test`                         | Run test suites                         |
| `pnpm format` / `pnpm format:check` | Prettier write / verify                 |
| `pnpm check:licenses`               | Verify dependency license compatibility |

### Repository layout

```
apps/web        Next.js application
apps/worker     Background job runner
packages/core   Domain logic — no framework or I/O imports
packages/db     Drizzle schema, migrations, RLS policies
packages/ui     Design system
packages/*      api-contract, adapters, gedcom
```

**The `packages/core` boundary will be enforced in CI** by a dedicated lint rule (tracked
separately). Domain logic must not import Next.js, Supabase, Hono, Drizzle, or any I/O
library. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Workflow

1. Open or claim an issue before starting non-trivial work.
2. Branch from `main`: `<type>/<short-kebab-summary>` (e.g. `feat/rls-policies`).
3. Make your change, with tests.
4. Run the quality gates below — all must pass locally.
5. Open a pull request using the template.

### Quality gates

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

For user-facing changes, also meet the Definition of Done in
[ROADMAP.md](ROADMAP.md) — responsive at 360/768/1280px, keyboard navigable, zero axe
violations, 48×48px touch targets, designed empty/loading/error states, undoable
destructive actions, and server-side authorization.

**Accessibility and data-integrity failures block a release. Other bugs do not.**

Never disable a lint rule, skip a test, or use `--no-verify` to get a gate to pass.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) and require a
**DCO sign-off**. Commit hooks enforce both.

```bash
git commit -s -m "feat(core): add relationship cycle validation"
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `build`.
Scopes: `core`, `db`, `ui`, `api`, `adapters`, `gedcom`, `web`, `worker`, `infra`,
`docs`, `deps`, `repo`.

### Developer Certificate of Origin

The `-s` flag adds a `Signed-off-by` trailer, certifying that you wrote the contribution
or have the right to submit it under Apache-2.0. See
[developercertificate.org](https://developercertificate.org/). We use DCO rather than a
CLA — there is no paperwork to sign.

## Dependencies

Runtime dependencies must be **Apache-2.0 compatible** (Apache-2.0, MIT, BSD, ISC).
Copyleft licenses (GPL, AGPL, LGPL, MPL, SSPL) are not permitted in anything we
distribute. Dev-only tooling under MPL-2.0 is acceptable because it is never bundled.

Run `pnpm check:licenses` before adding a dependency. Prefer boring, well-maintained
packages — the contributor pool for this domain is small, and exotic choices shrink it.

## Testing expectations

- Domain logic in `packages/core` is unit tested with no database and no network.
- **Any new database table requires an RLS policy and a pgTAP isolation test in the same
  pull request.** Tenant isolation is asserted in SQL, not through the UI.
- Test fixtures are always synthetic. Never commit real personal or family data.

## Privacy rules for contributors

- No real family data in fixtures, screenshots, issues, or tests.
- No personally identifiable information in logs, URLs, or notification bodies.
- Redact names and dates in bug reports and screenshots.

## Reporting bugs

Include what you expected, what happened, your device and browser, and screenshots with
personal data redacted. For anything security-related, follow [SECURITY.md](SECURITY.md)
instead of opening a public issue.

## Code of Conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
