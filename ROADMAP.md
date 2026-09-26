# Release Roadmap

Iteration plan for the family tree platform. Scope definitions live in
[FEATURES.md](FEATURES.md); technical decisions in [ARCHITECTURE.md](ARCHITECTURE.md).

**Operating principles**

1. **The UI is polished from v1.0.** Real families use the MVP, so the design system,
   typography, responsiveness, and accessibility are built in Iteration 0 — not retrofitted.
   A feature is not "done" until it meets the quality bar in [§2](#2-definition-of-done).
2. **Bare minimum means narrow, not rough.** v1.0 does few things, each finished.
3. **Two-week iterations, every one shippable.** No iteration ends with the product unusable.
4. **One real family as design partner from day one.** Recruit before Iteration 0 ends and
   watch them use every release. Their elders are the acceptance test.
5. **Ship behind feature flags.** Incomplete work merges dark rather than living on a branch.

---

## 1. Timeline at a Glance

| Release | Theme | Length | Audience |
| --- | --- | --- | --- |
| **I0** | Foundations + design system | 3 weeks | Internal |
| **I1** | Walking skeleton | 2 weeks | Internal |
| **v1.0** | **MVP — build and view a family tree** | 4 weeks | **1–3 real families (private beta)** |
| v1.1 | Engagement loop | 2 weeks | Beta families |
| v1.2 | Getting data in | 2 weeks | Beta families |
| v1.3 | Memories and media | 2 weeks | Open beta |
| v1.4 | Trust and moderation | 2 weeks | Open beta |
| v1.5 | Completeness and insight | 2 weeks | Public 1.5 |
| v1.6 | Sharing and growth | 2 weeks | Public |
| **v2.0** | Multi-family: tenancy + cross-tenant links | 6 weeks | Public |
| v2.x | Directory, events, reputation, API | 3 × 2 weeks | Public |
| **v3.0** | Federation, rich media, offline, i18n | 8+ weeks | Public |

Roughly 4 months to a usable public product, 7 to multi-family.

---

## 2. Definition of Done

Every user-facing change, from v1.0 onward, must satisfy all of the following before merge:

- [ ] Responsive at 360px, 768px, and 1280px
- [ ] Keyboard navigable with a visible focus ring
- [ ] Zero `axe-core` violations on the touched flow
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 UI; touch targets ≥ 48×48px
- [ ] Labels in plain language — no jargon, icons never unlabeled
- [ ] Loading, empty, and error states designed (not default browser output)
- [ ] Destructive actions confirmed and undoable
- [ ] Works at 200% browser zoom and with OS large-text settings
- [ ] Server-side authorization enforced, not just hidden in the UI
- [ ] Tenant-scoped queries covered by a pgTAP isolation test
- [ ] Tested by a non-technical person before release

The last item is the one that actually matters. If an elder cannot complete the flow
unaided, the iteration is not finished.

---

## 3. Iteration 0 — Foundations (3 weeks, internal)

No features. This exists so that every later iteration is fast and the UI bar is
structural rather than aspirational.

**Engineering**
- Monorepo, TypeScript strict, pnpm + Turborepo, CI pipeline
- Dockerfile + `docker compose up` local stack
- Supabase project; Drizzle schema for `tenant`, `tenant_member`, `person`, `relationship`, `assertion`
- RLS policies on every table + pgTAP isolation tests **passing before any feature is written**
- Supabase Auth wired with `active_tenant_id` in `app_metadata`
- Deploy pipeline to Cloud Run with a live staging URL

**Design system** *(runs in parallel, equal priority)*
- Type scale (18px base), color tokens, spacing, light/dark/high-contrast themes
- Core components: button, input, date field, card, dialog, toast, nav, avatar
- Accessibility primitives via Radix; axe-core in CI from the first component
- Person card and tree node designed as reusable components
- Mobile bottom nav and desktop shell

**Exit criteria:** an empty but beautiful, accessible, deployed shell; isolation tests green.

---

## 4. Iteration 1 — Walking Skeleton (2 weeks, internal)

One thin slice through every layer, to de-risk the architecture.

- Sign in with magic link
- Create a tenant; create one person
- Add a parent and a child; view them in a minimal tree
- Audit entry written on each change
- E2E Playwright test covering the whole path

**Exit criteria:** the team can sign in on a phone and add three relatives without touching the database.

---

## 5. v1.0 — MVP (4 weeks) → private beta

> **Goal:** a family can build their tree, see it, and trust it. Nothing more.

### In scope

| Area | Included |
| --- | --- |
| Auth | Magic link + phone OTP; scoped invite links; WhatsApp/QR invite sharing |
| Onboarding | Guided wizard: "Who are you?" → add parents → add children → done |
| Person | Name, nickname, gender, birth/death dates (incl. approximate), place, one photo, living flag, short bio |
| Relationships | Parent–child (biological/adopted/step) and spouse/partner with status |
| Tree | Pedigree + descendant views, SVG, pan/zoom with visible buttons, "center on me" |
| Profile | Person page with relatives, dates, photo |
| List view | Sortable, searchable table — the fallback for anyone overwhelmed by the graph |
| Search | Name search with fuzzy + phonetic matching |
| Editing | Own profile edits apply directly; everything else is a suggestion |
| Approval | Single queue with before/after diff; tenant admin approves |
| History | Version history per person; revert |
| Privacy | Fully login-gated; living-person protection on by default |
| Home | "Birthdays & anniversaries this month" — the one engagement hook in v1.0 |
| Admin | Member list, invites, pending approvals |

### Explicitly NOT in v1.0

Multi-tenant UI · cross-tenant links · federation · GEDCOM · media galleries · comments ·
stories · social import · badges · newsletter · PWA offline · i18n · verified-contributor
auto-promotion · branch moderators · relationship calculator · directory

> **Why no GEDCOM in the MVP:** most families have no GEDCOM file, and the format is a
> known time sink ([R11](FEATURES.md#162-open-source-sustainability-risks)). The onboarding wizard serves more users for a fraction of the
> effort. GEDCOM lands in v1.2, scoped to 7.0.

### Release gate
A real family adds 25+ people **without help**, and at least one member over 60 completes
a profile edit unaided.

---

## 6. v1.x — Two-Week Iterations

Each iteration has one theme, ships to users, and targets a specific risk.

### v1.1 — Engagement loop *(targets [R2](FEATURES.md#161-product-risks): no reason to return)*
- "On this day" on the home screen
- Birthday / anniversary / remembrance reminders by email and **WhatsApp** (no PII in message bodies)
- Notification centre + per-member channel preferences and quiet hours
- Activity feed: recent changes in your family

### v1.2 — Getting data in *(targets [R1](FEATURES.md#161-product-risks): cold start)*
- GEDCOM 7.0 import with preview-and-map before commit; 5.5.1 best-effort
- Bulk quick-add: "add all siblings" / "add all children" in one form
- Duplicate detection with merge
- GEDCOM 7.0 export (data portability from early on)

### v1.3 — Memories and media *(targets [R4](FEATURES.md#161-product-risks): painful data entry)*
- Photo gallery per person; drag-and-drop and mobile camera upload
- **Voice memories** — one-tap recording, the easiest contribution path for elders
- Weekly memory prompts
- **WhatsApp reply-to-contribute**: reply with a voice note or photo → pending suggestion
- Life events timeline

### v1.4 — Trust and moderation *(targets [R3](FEATURES.md#161-product-risks) and [R7](FEATURES.md#161-product-risks))*
- Verified contributors with scoped bypass
- Branch moderators
- Recent-changes patrol feed; challenge and revert
- Source/evidence attachments on suggestions; confidence levels
- Rate limits and abuse reporting

### v1.5 — Completeness and insight
- Branch completeness meter and missing-info quests
- Family statistics; relationship calculator ("how am I related to X?")
- Simple mode toggle; in-app text-size control
- Guided "show me how" tour

### v1.6 — Sharing and growth
- Consent-gated share cards (rendered images, never data)
- Family events module with RSVP and shared album
- Authenticated share links
- Monthly auto-generated family newsletter
- Contributor badges and milestones

---

## 7. v2.0 — Multi-Family (6 weeks)

The tenancy model is in the schema from I0; this release exposes it.

- Tenant switcher and "My families"
- Per-tenant branding, locale, privacy defaults, custom fields
- **Cross-tenant linking** with dual consent and negotiated sharing scopes
- Father's-tenant default for children of cross-tenant marriages, switchable
- Cross-tenant suggestions routed to the home tenant
- Linked-person badges and dashed connectors in the tree

### v2.1–v2.3 (2 weeks each)
- Opt-in family directory; link requests with anti-abuse quotas
- Public OpenAPI 3.1, API keys, webhooks, generated SDK
- Approval rules engine; auto-promotion thresholds; tenant merge/split

---

## 8. v3.0 — Depth (8+ weeks)

Requires dedicated compute — ffmpeg and AI media cannot run on scale-to-zero serverless.

- Cross-instance federation (RFC 9421 signed server-to-server)
- Family Reel generator; AI photo restoration; face tagging *(all opt-in)*
- Instagram / Google Photos selective import
- PWA offline with queued edits
- Multi-language via Weblate; RTL
- GEDCOM-X + JSON-LD export; printed family book
- Helm chart and plugin system

---

## 9. Metrics per Phase

Track from v1.0. These are the leading indicators of the failure modes in the risk register.

| Metric | Why | v1.0 target |
| --- | --- | --- |
| Time to first 10 people | Cold start friction (R1) | < 15 min |
| Members who are **not** the tenant creator | Single-keeper dependency (R3) | ≥ 3 per family |
| 30-day contributor retention | Return loop (R2) | ≥ 40% |
| Profiles with a photo or story | Content depth | ≥ 30% |
| Elder (60+) unaided task completion | Usability (R4) | ≥ 80% |
| Suggestions approved vs. rejected | Moderation health (R7) | — (baseline) |

If time-to-first-10 or non-creator member count misses target, **stop adding features and
fix onboarding.** Those two numbers predict whether the project survives.

---

## 10. Working Agreements

- **Cadence:** 2 weeks — 1 day planning, 8 days build, 1 day hardening, release Thursday.
- **Capacity split:** ~70% themed feature work, ~20% UI/a11y polish and bug fixes, ~10% maintenance (deps, docs, CI).
- **Every iteration ends with a design partner session.** Watch, do not instruct.
- **Bug policy:** accessibility and data-integrity bugs block a release; nothing else does.
- **Scope control:** if an iteration overruns, cut scope, never the definition of done.
- **Governance:** a second maintainer with commit rights before v1.0 ships ([R9](FEATURES.md#162-open-source-sustainability-risks), [R16](FEATURES.md#162-open-source-sustainability-risks)).
