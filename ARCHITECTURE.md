# Architecture

Technical architecture for the family tree platform. Feature scope lives in
[FEATURES.md](FEATURES.md); this document covers _how_ it is built and _why_ those
choices were made.

**Guiding constraints**

1. **Serverless first** — scale-to-zero economics for v1–v2, dedicated capacity only where it pays.
2. **Self-hostable** — every dependency must be runnable by a family on their own hardware.
3. **Apache-2.0 compatible** — no copyleft in distributed artifacts (§13.1 of FEATURES).
4. **Boring and mainstream** — the contributor pool for genealogy software is small (R10); exotic tech shrinks it further.
5. **No lock-in** — the same container runs on a laptop, on Cloud Run, and on a VM.

---

## 1. Stack Summary

| Layer             | Choice                                                              | License                  |
| ----------------- | ------------------------------------------------------------------- | ------------------------ |
| Language          | TypeScript (strict)                                                 | Apache-2.0               |
| Frontend          | Next.js (App Router) + React                                        | MIT                      |
| Styling           | Tailwind CSS + shadcn/ui (Radix primitives)                         | MIT                      |
| Tree rendering    | `d3-hierarchy` for layout; SVG → Canvas above ~500 nodes            | ISC                      |
| API               | Hono, mounted inside Next; extractable standalone                   | MIT                      |
| Validation        | Zod (drives types, request validation, and OpenAPI 3.1)             | MIT                      |
| Data access       | Drizzle ORM + `postgres.js`                                         | Apache-2.0               |
| Database          | Supabase Postgres (RLS-enforced multi-tenancy)                      | Apache-2.0               |
| Auth              | Supabase Auth (GoTrue) — magic link, phone OTP, OAuth, MFA          | Apache-2.0               |
| Storage           | S3-compatible: Supabase Storage → Cloudflare R2 → MinIO (self-host) | —                        |
| Search            | Postgres FTS + `pg_trgm` + `fuzzystrmatch` (Double Metaphone)       | PostgreSQL               |
| Jobs / queue      | `pgmq` + `pg_cron`, worker in a scale-to-zero container             | PostgreSQL               |
| Realtime          | Supabase Realtime (deferred; only if push genuinely required)       | Apache-2.0               |
| Email / messaging | Adapter interface; SMTP default, WhatsApp Cloud API, Telegram       | —                        |
| Images            | `sharp`                                                             | Apache-2.0               |
| PWA               | Serwist                                                             | MIT                      |
| i18n              | `next-intl` + Weblate                                               | MIT                      |
| Observability     | OpenTelemetry (+ GlitchTip optional)                                | Apache-2.0               |
| Testing           | Vitest, Playwright, axe-core, pgTAP                                 | MIT / MPL-2.0 (dev only) |
| Monorepo          | pnpm workspaces + Turborepo                                         | MIT                      |

> `axe-core` is MPL-2.0 and is a **dev/CI dependency only** — it is never bundled into a
> distributed artifact, so the Apache-2.0 distribution stays clean.

---

## 2. Repository Layout

```
family-tree/
├── apps/
│   ├── web/                  # Next.js app — UI + thin route handlers
│   └── worker/               # Background jobs (digests, imports, messaging)
├── packages/
│   ├── core/                 # Domain logic — NO framework imports
│   │   ├── person/           # Person, names, dates, evidence/conclusion
│   │   ├── relationship/     # Edges, validation, relationship calculator
│   │   ├── approval/         # Proposals, rules engine, trust levels
│   │   ├── tenancy/          # Tenant context, scopes, cross-tenant links
│   │   └── privacy/          # Field visibility resolution
│   ├── db/                   # Drizzle schema, migrations, RLS policies
│   ├── gedcom/               # GEDCOM 7.0 read/write, 5.5.1 import
│   ├── api-contract/         # Zod schemas → OpenAPI 3.1 → generated SDK
│   ├── adapters/             # Storage, email, messaging, social plugins
│   └── ui/                   # Design system, typography scale, a11y primitives
├── infra/
│   ├── docker/               # Dockerfile(s), compose for local dev
│   └── helm/                 # Self-host chart (v3)
└── docs/
    └── adr/                  # Architecture decision records
```

### The core rule

`packages/core` **must not import** Next.js, Supabase, Hono, or any I/O library. It
receives repository interfaces and returns plain data. Everything else is an adapter
around it.

This is non-negotiable because the spec commits to federation, a plugin system, and
self-hosting. If approval rules or scope enforcement leak into route handlers, none of
those are reachable without a rewrite — that is [R12](FEATURES.md#162-open-source-sustainability-risks) in the risk register.

A CI lint rule enforces the import boundary.

**How it is enforced.** `eslint.config.mjs` applies `no-restricted-imports` to
`packages/core/**/*.ts`, rejecting:

- Frameworks and clients — `next`, `react`, `@supabase/*`, `hono`, `drizzle-orm`, `pg`, `postgres`
- Node I/O built-ins — `node:fs`, `node:http`, `node:net`, `node:dns`, `node:child_process`, and their bare aliases
- Other workspace packages — `@family-tree/db`, `adapters`, `ui`, `api-contract`, `gedcom`

Core therefore depends only on interfaces it defines itself; `packages/db` and
`packages/adapters` implement them. A second check
(`scripts/lib/core-boundary.test.mjs`) asserts that `packages/core/package.json`
declares no runtime, peer, or optional dependencies, so the boundary cannot be
reopened through the manifest instead of through an import.

Both run in the `quality` CI job and fail the build.

---

## 3. Data Architecture

### 3.1 Tenant Isolation

Isolation is enforced in **Postgres**, not in application code.

- Every domain table carries a non-nullable `tenant_id`.
- Row-level security is enabled on every table with a policy keyed to the JWT claim.
- Requests run through a role that **cannot bypass RLS** (never `service_role` for user traffic).
- A forgotten `WHERE tenant_id = ...` therefore returns zero rows rather than leaking.

```sql
alter table person enable row level security;

create policy tenant_isolation on person
  using (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'active_tenant_id')::uuid);
```

- Tenant membership and roles live in `tenant_member`; the **active tenant** is written
  into `app_metadata` on sign-in and on tenant switch, so RLS reads it directly.
- Cross-tenant reads never relax RLS. They go through an explicit, separately-audited
  path that checks the negotiated sharing scope server-side.

### 3.2 Domain Model Notes

- **Relationships are first-class rows**, not `father_id` / `mother_id` columns. Typed
  edges (`biological`, `adopted`, `step`, `guardian`, `spouse`) with their own dates and
  metadata are the only way to represent the cases in §2.3 without a later rewrite.
- **Evidence vs. conclusion** (GEDCOM-X model) is in the schema from day one: an asserted
  fact carries source, confidence, and submitter, separate from the accepted conclusion.
  Retrofitting this is the classic failure mode (R12).
- **Dates are structured, not strings** — supporting exact, approximate, range, before/after,
  and partial values, with an ISO 8601 rendering for export.
- **Nothing is hard-deleted.** Soft delete plus full version history per entity.

### 3.3 Search

Postgres only, no extra service:

- `pg_trgm` GIN indexes for fuzzy name matching.
- `fuzzystrmatch` Double Metaphone for phonetic variants of regional names.
- `tsvector` column, maintained by trigger, for full-text across names, places, and bios.

Meilisearch or Typesense is a **v3 contingency**, added only if Postgres measurably
struggles on real data — not preemptively.

### 3.4 Connection Management

Serverless plus direct Postgres connections exhausts the connection limit fast. All app
traffic goes through **Supavisor in transaction mode**; migrations use a direct
connection. Drizzle with `postgres.js` is configured for `prepare: false` in transaction
pooling mode.

---

## 4. Application Architecture

### 4.1 Request Path

```
Client → Next route handler / Hono route
       → auth + tenant context resolution
       → packages/core use case
       → repository interface → Drizzle → Postgres (RLS enforced)
```

- Authorization is evaluated **server-side on every mutation**. The UI hides actions as a
  convenience, never as a control.
- Every write produces an audit entry and a version snapshot in the same transaction.

### 4.2 Approval Pipeline

Suggestions from unverified users and direct writes from verified contributors traverse
the _same_ code path; the only difference is whether the proposal auto-applies:

```
suggest() → validate() → resolveTrustLevel() → {
    verified in scope  → apply() + audit(bypass: true)
    otherwise          → enqueue for review → approve() → apply()
}
```

Keeping one path means a bypass can never skip validation, auditing, or versioning.

### 4.3 Tree Rendering

The real performance constraint is the client, not the API.

- `d3-hierarchy` computes layout in a **Web Worker**, keeping the main thread free.
- **SVG** below ~500 visible nodes (accessible, styleable, easy to test).
- **Canvas** above that, with viewport virtualization — never render thousands of DOM nodes.
- The API returns paginated subtrees by depth; branches lazy-load on expand.
- An accessible list view mirrors the graph for screen readers (WCAG requirement, §8.3).

### 4.4 Background Work

`pgmq` queues in the same Postgres instance — no Redis, no broker.

- `pg_cron` schedules recurring work (digests, On This Day, prompt dispatch).
- A scale-to-zero worker container drains the queue.
- Jobs are idempotent and carry `tenant_id`; retries use exponential backoff with a dead-letter queue.

### 4.5 Adapters and Plugins

Storage, email, messaging, social import, and GEDCOM-style importers all sit behind
narrow interfaces in `packages/adapters`. This satisfies the plugin commitment and means
self-hosters supply their own provider credentials without forking.

---

## 5. Infrastructure Path

### v1 — serverless, near-zero cost

| Component                 | Runs on                                    |
| ------------------------- | ------------------------------------------ |
| Web app                   | Google Cloud Run (scale-to-zero container) |
| Database + Auth + Storage | Supabase free tier                         |
| Cron                      | Cloud Scheduler → `pg_cron`                |
| CI/CD                     | GitHub Actions → container registry        |

**Cloud Run over Vercel.** Vercel has better DX, but the stated plan is to move to
dedicated VMs. Cloud Run runs the _identical container_ you will later run on a VM, so
that migration is a deployment change rather than a port. Vercel remains a supported
target for contributors who prefer it.

#### Staging project

| Setting              | Value                                                     |
| -------------------- | --------------------------------------------------------- |
| Supabase project ref | `ymdxmhpfdurkfdbryfwr`                                    |
| Region               | `ap-northeast-2`                                          |
| Postgres role        | `postgres` (local compose creates the same role)          |
| Database             | `postgres` — required by `pg_cron`'s `cron.database_name` |

#### Free-tier limits, in the order they will bite

| Limit                     | Free tier                | What happens first                                                                                                          |
| ------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Project pausing**       | Paused after 7 days idle | Bites before any quota during early development — a staging project nobody touched for a week needs manual resuming         |
| **Active projects**       | 2 per organisation       | Staging plus production fills the allowance; a third needs a paid plan                                                      |
| Database size             | 500 MB                   | Thousands of people and relationships fit easily; media is the real consumer, and it lives in object storage                |
| Storage                   | 1 GB                     | **The first quota to be exhausted in practice.** A few hundred family photos reach it, which is why media moves to R2 in v2 |
| Egress                    | 5 GB/month               | Image bandwidth, not API traffic. Same trigger as above                                                                     |
| Direct connections        | 60                       | Never reached through the pooler, trivially exhausted without it                                                            |
| Pooler client connections | 200                      | The number that actually matters for serverless                                                                             |

Practical consequence: **storage and egress force the R2 move before database size ever
matters**, and idle pausing is a development nuisance rather than a scaling limit.

#### Secrets

Set per environment; never committed. CI reads them by name only.

| Name                        | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`              | Supavisor transaction-mode URL, port 6543 — application traffic     |
| `DIRECT_URL`                | Direct connection, port 5432 — migrations only                      |
| `SUPABASE_ANON_KEY`         | Browser-side Supabase client                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; **never** used for user traffic, since it bypasses RLS |

Stored as GitHub Actions secrets for CI and Secret Manager for Cloud Run.

### v2 — separated concerns, still scale-to-zero

- Worker extracted into its own Cloud Run service.
- Media moved to **Cloudflare R2** — zero egress fees. Image bandwidth, not compute, will
  be the largest cost line.
- CDN in front of rendered share cards.
- Read replica if reporting queries start competing with user traffic.

### v3 — dedicated capacity where it pays

- **ffmpeg (Family Reel) and AI photo restoration cannot run in typical serverless** —
  CPU-bound, memory-hungry, minutes-long. These need a container with real limits or a
  dedicated VM. Budget for this when v3 is scheduled.
- Helm chart published for self-hosters.
- Federation endpoints benefit from stable egress IPs, which favors VMs.

### Self-host profile

`docker compose up` brings up the app, worker, self-hosted Supabase, and MinIO with a
seeded demo tenant. Single-tenant mode hides the tenancy UI. No feature is gated.

---

## 6. Security

- RLS as the last line of defense, with app-layer checks in front of it.
- Media served only through short-lived signed URLs bound to a session; no permanent public URLs.
- OAuth and messaging provider tokens encrypted at rest, tenant-scoped, never sent to the browser.
- Strict CSP; user-generated bios and comments sanitized server-side on write **and** escaped on render.
- Webhook payloads signature-verified and treated as untrusted input.
- Uploads: type sniffing, size limits, virus scan, EXIF GPS stripped by default.
- Rate limits per user, per tenant, and per IP — particularly on open suggestions and link requests.
- Secrets via environment/secret manager; nothing in the repo. Dependency and secret scanning in CI.

---

## 7. Testing Strategy

| Type          | Tool                        | Non-negotiable coverage                                                 |
| ------------- | --------------------------- | ----------------------------------------------------------------------- |
| Unit          | Vitest                      | Relationship validation, date parsing, approval rules, scope resolution |
| Database      | pgTAP                       | **Tenant isolation asserted in SQL**                                    |
| Integration   | Vitest + ephemeral Postgres | Repository and migration behavior                                       |
| E2E           | Playwright                  | Onboarding, suggest→approve, cross-tenant link                          |
| Accessibility | axe-core in Playwright      | Zero violations on core flows                                           |
| Performance   | Lighthouse CI               | 200-person tree renders < 2s on simulated 3G                            |

**Tenant isolation must be tested at the SQL layer.** An application-level test can pass
merely because the UI filtered the results; a pgTAP test proves a session scoped to
tenant A genuinely cannot read tenant B.

---

## 8. Architecture Decision Records

Full ADRs live in `docs/adr/`. Summary:

| ADR | Decision                            | Rationale                                                 | Consequence                                       |
| --- | ----------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| 001 | TypeScript everywhere               | One language, shared types, widest contributor pool       | Must accept Node's CPU limits for media work      |
| 002 | Postgres via Supabase               | RLS _is_ the tenancy model; Apache-2.0 and self-hostable  | Supavisor pooling required in serverless          |
| 003 | RLS for tenant isolation            | Fails closed on a forgotten filter                        | Every table needs a policy; test with pgTAP       |
| 004 | Drizzle over Prisma                 | SQL-first keeps RLS visible; small cold start             | Less scaffolding, more hand-written SQL           |
| 005 | Framework-agnostic `packages/core`  | Enables federation, plugins, and API extraction           | Boundary must be lint-enforced                    |
| 006 | Modular monolith, not microservices | The top risk is having no users, not scale                | Module boundaries must be respected internally    |
| 007 | Containers on Cloud Run, not Vercel | Identical artifact migrates to VMs unchanged              | Slightly more setup than Vercel                   |
| 008 | Postgres FTS over a search service  | No extra infrastructure; covers fuzzy + phonetic          | Revisit only if measured to be insufficient       |
| 009 | `pgmq` over Redis/SQS               | Queue lives in the database we already run                | Worker must poll; needs a scale-to-zero container |
| 010 | Relationships as typed edges        | Handles adoption, step, multiple marriage without rewrite | More joins than parent columns                    |
| 011 | Evidence/conclusion in v1 schema    | Retrofitting it is the classic project-killer             | Higher initial modeling cost                      |
| 012 | S3-compatible storage abstraction   | Portable across Supabase, R2, and MinIO                   | Cannot use provider-specific storage features     |
| 013 | REST + OpenAPI, GraphQL deferred    | Simpler to document, cache, and generate SDKs from        | GraphQL only if integrators demand it             |
| 014 | Canvas above ~500 nodes             | DOM cannot handle large trees                             | Two rendering paths to maintain                   |
| 015 | Defer Realtime, Redis, Kubernetes   | Operational surface without user demand                   | Revisit when metrics justify it                   |

---

## 9. Explicitly Deferred

Not in v1, and that is deliberate:

- Microservices, Kubernetes, service mesh
- GraphQL
- Elasticsearch / Meilisearch
- Redis / separate cache tier
- Edge runtime for app routes (`sharp` and GEDCOM parsing fight it)
- Native mobile apps — PWA first
- Event sourcing / CQRS
- Multi-region deployment

Each returns only when a measured problem demands it.
