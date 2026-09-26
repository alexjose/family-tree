# Family Tree Web Application — Feature Specification

An **open-source (Apache-2.0), multi-tenant, login-gated** collaborative family tree platform.
Each family runs its own tenant (its own tree, members, and rules). Editing is
**Wikipedia-style**: any authenticated user may suggest a change to any record they can
see, and verified contributors for a given tree have their edits applied immediately.
No tree data or PII is ever served without login. Families that intermarry can link
their trees across tenants — and across separate self-hosted instances — without merging
or surrendering ownership of their data.

See [§3 Open Contribution](#3-open-contribution--approval-workflow), [§11 Multi-Tenancy](#11-multi-tenancy), [§12 Cross-Tenant Linking](#12-cross-tenant-linking-marriage--shared-relatives),
[§13 Open Source & Open Standards](#13-open-source--open-standards), [§14 Engagement & Retention](#14-engagement--retention), [§15 Social & Messaging Integration](#15-social--messaging-integration),
and [§16 Risks & Mitigations](#16-risks--mitigations). Resolved decisions are summarized in [§18](#18-decisions-made).

---

## 1. Product Principles

| Principle | What it means in practice |
| --- | --- |
| Users before features | Onboarding friction and the engagement loop outrank everything else ([§16.3](#163-guiding-conclusion)) |
| Elder-friendly | Large tap targets (min 48×48px), high contrast, plain language, no jargon |
| Low cognitive load | One primary action per screen, progressive disclosure of advanced options |
| Forgiving | Undo everywhere, autosave drafts, confirmation before destructive actions |
| Trustworthy | Every change is attributed, reviewable, and reversible |
| Inclusive | Works on old phones, slow networks, and with screen readers |
| Tenant-sovereign | Each family owns, controls, and can export or delete its own data |
| Open by default | Apache-2.0, open standards, no proprietary lock-in on data or identity |
| Open to contribute, closed to strangers | Anyone signed in may suggest edits; nobody signed out sees anything |

---

## 2. Core Features

### 2.1 Authentication & Onboarding
- Sign in with email magic link, phone OTP, and Google/Apple social login.
- Passwordless-first (elders forget passwords); optional password fallback.
- Invite-based registration: existing members invite relatives via link, email, WhatsApp share, or QR code.
- Invite links are scoped — the invitee is pre-linked to a specific node in a specific tenant.
- Guided first-run wizard: "Join a family or start one?" → "Who are you?" → find yourself in the tree or create a new node → confirm relationships → done.
- One identity, many families: a user signs in once and switches tenants from a "My families" menu.
- Session persistence ("Keep me signed in") so elders aren't re-authenticating constantly.

### 2.2 Person Profiles
- Core fields: full name, nickname / "known as", gender, date of birth, place of birth, date of death, photo.
- Extended fields: biography, occupation, education, residence history, religion/community, blood group.
- Contact fields: phone, email, address, social links — with per-field privacy controls.
- Life events timeline: birth, marriage, graduation, relocation, death, custom events.
- Media gallery per person: photos, scanned documents, audio/video memories.
- Living vs. deceased flag — living persons' sensitive data is auto-hidden from public views.
- "Memorial mode" for deceased members: tribute wall, condolence notes.

### 2.3 Relationships
- Parent–child (biological, adopted, step, foster, guardian).
- Spouse/partner with status: married, engaged, divorced, separated, widowed, partnered.
- Multiple marriages and blended families supported.
- Siblings derived automatically; half-siblings and step-siblings distinguished.
- Relationship metadata: marriage date, place, divorce date.
- Automatic relationship calculator: "How am I related to X?" → "Your father's cousin's daughter — second cousin."
- Consistency validation: prevents cycles, impossible dates (child born before parent), duplicate spouse links.

### 2.4 Tree Visualization
- **Pedigree view** — ancestors of a selected person (default for exploring lineage).
- **Descendant view** — all descendants of an ancestor.
- **Hourglass view** — ancestors + descendants of the focus person.
- **Family group card** — a couple and their children in a simple card layout.
- **List/table view** — sortable, searchable; the fallback for users overwhelmed by graphics.
- Interactions: pinch-zoom, pan, tap to focus, "center on me" button, zoom slider with +/− buttons (not just gestures).
- Collapse/expand branches; lazy-load large trees for performance.
- Mini-map for orientation in large trees.
- Breadcrumb trail showing the navigation path back to the focus person.
- Print/export view: A4/Letter-friendly PDF and PNG export.

### 2.5 Search & Discovery
- Global search bar: names, nicknames, places, years.
- Fuzzy and phonetic matching (handles spelling variants of regional names).
- Filters: generation, surname, birth decade, living/deceased, location.
- "Birthdays & anniversaries this month" widget.
- "People you may know" / unlinked-relative suggestions.
- Duplicate person detection with a merge workflow.

---

## 3. Open Contribution + Approval Workflow

The editing model is **Wikipedia-style**: any authenticated user may suggest a change to
any record they can see. Nothing is locked — but nothing lands unreviewed either, unless
it comes from a verified contributor for the tree they are verified against.

### 3.1 Contribution Model
- **Anyone authenticated can suggest an edit** to any person, relationship, or media item visible to them — including people they are not related to.
- Every suggestion enters the approval queue as a proposal; the tree itself is never edited directly by unverified users.
- Suggestions carry an optional rationale and evidence attachment; reviewers see both.
- There is no "you may not edit this" dead end — the UI always offers **Suggest an edit** instead of a disabled button.
- Anonymous/logged-out contribution is **not** permitted (see [§6.1](#61-login-gated-access)).

### 3.2 Verified Contributors
- A **verified contributor** is a user whose identity and relationship to a specific tree have been confirmed. Their edits **apply immediately**, bypassing the approval queue.
- Verification is **scoped to an associated tree (tenant) and optionally a branch** — verified in your own family does not grant bypass in anyone else's.
- Paths to verification:
  - Claimed own profile within the tenant ([§3.5](#35-claiming-a-profile)) — auto-verifies for their own record.
  - Granted by a Tenant Admin or Branch Moderator.
  - Earned automatically: *N* accepted proposals in that tenant with no reversions in *M* days (thresholds configurable per tenant, off by default).
- Bypass is **not** unchecked: verified edits are still versioned, attributed, and shown in the activity feed, and can be challenged or reverted by moderators.
- Bypass can be narrowed per field class (e.g. verified contributors bypass review for bio/photo but not for parentage).
- Verification is revocable; a revoked contributor's edits revert to proposal-only.
- Trust levels in ascending order: **Guest → Contributor → Verified Contributor → Branch Moderator → Tenant Admin**.

### 3.3 Ownership Model
| Scope | Who may edit directly |
| --- | --- |
| Own profile | The claimed account owner (auto-verified) |
| Minor children / dependents | Linked guardian |
| Any record in a tree where the user is a **verified contributor** | Applies immediately, within the configured field scope |
| Any visible record, by any other authenticated user | Suggestion only — enters the approval queue |
| Relationship links | Suggestion — requires approval from both sides' owners or a moderator |
| A person in another tenant | Read-only; cross-tenant suggestion routed to their home tenant ([§12.4](#124-editing-across-tenants)) |

### 3.4 Change Proposal Flow
1. **Draft** — user edits any field; changes autosave as a draft.
2. **Submit** — user submits with an optional note and source/evidence attachment.
3. **Route** — system determines approvers:
   - Profile owner (if the subject has a claimed account)
   - Branch moderator (for the relevant family branch)
   - Any admin as fallback / escalation
4. **Review** — approver sees a clear side-by-side diff: *Before → After*, per field, with the submitter's trust level shown.
5. **Decision** — Approve · Approve with edits · Request changes (with comment) · Reject.
6. **Apply** — approved changes merge into the live tree; a version snapshot is stored.
7. **Notify** — submitter and watchers are notified of the outcome.

> Verified contributors skip steps 3–5 for their verified scope; the change applies at step 6 and is announced at step 7.

### 3.4.1 Approval Rules Engine
- Configurable per field: auto-approve low-risk fields (photo, bio) vs. require review for high-risk ones (name, parentage, dates).
- Quorum rules: e.g. structural changes need 2 approvals, or 1 admin.
- Auto-approve after N days if no reviewer responds (configurable, off by default).
- Conflict handling: if two proposals touch the same field, the second is flagged for manual resolution.
- Per-tenant thresholds for automatic promotion to verified contributor.

### 3.5 Claiming a Profile
- A person node can exist without an account. Any user may "claim this is me."
- Claim requires verification: invite-link match, or approval by an existing linked relative, or admin approval.
- Once claimed, that user becomes the profile owner and a verified contributor for their own record.

### 3.6 Audit & History
- Full version history per person and per relationship.
- "Who changed what, when, and why" log with diffs, including whether it was reviewed or applied via verified bypass.
- One-click revert to any prior version (itself an auditable action).
- Soft delete only — nothing is permanently removed without an admin purge.
- Public (login-gated) recent-changes feed per tenant, so the community can spot bad edits — Wikipedia-style patrolling.
- Contributor profile page: edit count, acceptance rate, trees where verified.

---

## 4. Roles & Permissions

| Role | Capabilities |
| --- | --- |
| **Guest (authenticated)** | Read anything visible to them; suggest edits anywhere; no direct writes |
| **Member** | Guest rights + own profile, media upload, comments |
| **Verified Contributor** | Member rights + edits apply immediately within their verified tree/branch scope |
| **Guardian** | Member rights + direct edit of linked dependents |
| **Branch Moderator** | Approve/reject suggestions within an assigned branch; grant/revoke verification; merge duplicates |
| **Tenant Admin** | Full edit within the tenant, role management, invites, restore/purge, tenant settings |
| **Tenant Owner** | Tenant Admin rights + billing, cross-tenant link approval, data export, tenant deletion |
| **Instance Operator** | Self-host operator: provisioning, quotas, upgrades — no access to tenant content by default |

- There is no unauthenticated role — all access requires login ([§6.1](#61-login-gated-access)).
- Permissions are additive and assignable per branch, not just globally.
- **All roles are scoped to a tenant.** A user account may hold different roles in different tenants (e.g. Verified Contributor in their birth family, Guest in a linked family).

---

## 5. Collaboration & Engagement
- Comments and discussion threads on a person or an event.
- @mentions with notifications.
- "Watch this person" to follow changes.
- Stories: long-form memories attached to a person, with contributor credits.
- Photo tagging: tag people in group photos, auto-linking to their profiles.
- Notification center + digest email/SMS (daily or weekly, user-selectable).
- Activity feed: "Recent changes in your family."

---

## 6. Privacy & Safety

### 6.1 Login-Gated Access
- **No PII and no tree data is served to anonymous visitors — ever.** There is no public tree view, no public profile page, and no anonymous read API.
- Unauthenticated routes are limited to: marketing/landing page, sign-in, sign-up, invite acceptance, legal pages, and the opt-in family directory's minimal entries ([§12.7](#127-opt-in-family-directory)).
- Share links are **authenticated share links**: the recipient must sign in (or accept an invite) before the shared content resolves.
- No search-engine indexing of any person data; `noindex` plus `robots.txt` deny on all app routes.
- No PII in URLs, page titles, OG/meta tags, emails, push notifications, or logs — notifications say "A record you follow was updated," not the details.
- Media served only via short-lived signed URLs bound to an authenticated session; no permanent public object URLs.
- Exports and API responses are equally gated — gating is enforced server-side, not by hiding UI.

### 6.2 Visibility Tiers
- Three visibility tiers per field, all *within* the authenticated boundary: **All members** · **Family only** · **Private (owner + admin)**.
- "Public" means *visible to signed-in users of this tenant* — never visible to the open internet.

### 6.3 Protections
- Living-person protection enabled by default (hide DOB, contact info, address from non-family).
- Right to be forgotten: a member can request removal of their personal data; the node is anonymized rather than breaking the tree.
- Consent prompt before publishing a photo that tags another living member.
- Children under 18: minimal data, guardian-controlled, never exposed beyond the tenant.
- Rate limiting and abuse reporting on comments, uploads, and edit suggestions.
- Open contribution is balanced by throttles: new accounts have suggestion rate limits and cannot attach media until their first suggestion is accepted.

---

## 7. Data Import / Export
- **Import**: GEDCOM 5.5.1 / 7.0, GEDCOM-X, CSV template, bulk photo upload with a preview-and-map step before commit.
- **Export**: GEDCOM 7.0, GEDCOM-X, CSV, JSON-LD (schema.org `Person`), and a printable PDF family book.
- Round-trip fidelity is guaranteed **only for our own export → re-import**; unmapped third-party fields are preserved verbatim in an extension block rather than silently dropped. Lossless round-trip with arbitrary vendors is explicitly a non-goal ([R11](#162-open-source-sustainability-risks)).
- Full tenant export ("take your tree and leave") — a single archive containing data + media + audit history.
- Full account data export (GDPR-style) on request.
- Scheduled automatic backups; admin-triggered restore point creation.
- See [§13.2](#132-interoperability-standards) for the complete standards matrix.

---

## 8. UI / UX Requirements

### 8.1 Typography
- Body text base **18px** (not 16px) — larger default for readability.
- Scale: 18 / 20 / 24 / 30 / 38 / 48px with a ~1.25 modular ratio.
- Line height 1.6 for body, 1.2 for headings.
- Max line length 65–75 characters.
- Font: a humanist sans-serif with clear letterforms and tall x-height (e.g. Inter, Source Sans 3, or system UI stack). Avoid thin/light weights — minimum weight 400.
- Tabular numerals for dates and years.
- Full Unicode/regional script support for native-language names.

### 8.2 Layout & Interaction
- Mobile-first responsive: single column < 640px, two-pane 640–1024px, three-pane > 1024px.
- Sticky bottom navigation on mobile: **Tree · Search · Add · Notifications · Me**.
- Minimum touch target 48×48px with 8px spacing.
- Generous whitespace; cards with soft shadows and rounded corners (8–12px radius).
- Skeleton loaders instead of spinners.
- Empty states with an illustration and one clear call to action.
- Forms: one question group per step, inline validation, plain-language errors ("Please enter a year like 1958").
- Date inputs accept partial dates ("about 1940", "1940s", "before 1965").
- Undo toast after every save/delete.

### 8.3 Accessibility (WCAG 2.2 AA)
- Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI components.
- Full keyboard navigation with a visible focus ring.
- Semantic HTML and ARIA labels; the tree graph has an accessible list equivalent.
- Screen-reader announcements for async updates.
- Respects `prefers-reduced-motion` and OS text-size settings.
- User-controlled **text size toggle** (Normal / Large / Extra Large) in the app itself.
- Light and dark themes, plus a high-contrast theme.

### 8.4 Elder-Specific Affordances
- "Simple mode": hides advanced features, shows only View, Search, and Edit My Profile.
- Icons always paired with text labels — never icon-only for primary actions.
- Confirmation dialogs written as questions: "Remove this photo? You can undo this."
- Voice input for search and text fields.
- Built-in short help videos and a "Show me how" guided tour, replayable anytime.
- Zoom controls as visible buttons, not gesture-only.
- Optional larger-spacing "comfortable" density setting.

### 8.5 Internationalization
- Multi-language UI with RTL support.
- Localized date formats and calendars.
- Per-person name variants in multiple scripts.

---

## 9. Non-Functional Requirements
- Initial tree render < 2s on a 3G connection for a 200-person tree.
- Offline-capable PWA: view cached tree, queue edits for sync.
- Installable on home screen; push notifications.
- Image optimization: WebP/AVIF, responsive srcset, lazy loading.
- Soft-delete + 30-day recovery window.
- Encryption at rest and in transit; signed URLs for media.
- Server-side authorization on every mutation — never trust the client.
- Tenant isolation enforced at the database layer (RLS); every request carries a verified tenant context.
- Cross-tenant reads authorized against the negotiated sharing scope on every request.
- Noisy-neighbour protection: per-tenant rate limits and job-queue fairness.
- Input sanitization and CSP to prevent XSS in user-generated bios and comments.
- Audit logs immutable and retained per policy.
- Automated tests must include tenant-isolation cases (a tenant must never read another's data).

---

## 10. Admin Console
- Pending approvals queue with bulk actions.
- Member directory with role assignment and invite management.
- Duplicate detection and merge tool.
- Data health dashboard: missing DOBs, orphan nodes, broken links, unverified claims.
- Configure approval rules, privacy defaults, and branch moderators.
- Moderation queue for reported content.
- Usage analytics: active members, growth of tree, most-viewed profiles.
- Cross-tenant link inbox: pending link requests, active links, and their sharing scopes.

---

## 11. Multi-Tenancy

### 11.1 Tenancy Model
- A **tenant** = one family space: its own tree, members, roles, approval rules, branding, and settings.
- A **user account is global**; tenant membership is a separate, many-to-many relationship.
- A user can belong to any number of tenants and switch between them without re-authenticating.
- Tenant addressing: subdomain (`nair.familytree.org`), custom domain, or path prefix (`/t/nair`) — configurable per deployment.
- Tenant creation is self-service: "Start your family tree" → name, language, privacy defaults → invite relatives.

### 11.2 Isolation & Data Model
- Every domain row carries a non-nullable `tenant_id`; every query is tenant-scoped at the data-access layer, not just in application code.
- Enforce isolation with **row-level security** (e.g. Postgres RLS with a session `tenant_id`), so a missing filter fails closed rather than leaking.
- Deployment options: shared schema (default), schema-per-tenant, or database-per-tenant for families needing hard isolation or data residency.
- Media stored under tenant-prefixed paths with tenant-scoped signed URLs.
- Background jobs, exports, search indexes, and caches are all tenant-partitioned; cache keys always include the tenant.
- Audit logs record `tenant_id` + `actor_id` and never cross tenant boundaries.

### 11.3 Per-Tenant Configuration
- Branding: family name, crest/logo, accent color, cover photo.
- Locale, default calendar, and date format.
- Privacy defaults, living-person protection level, and public-visibility policy.
- Approval rules engine settings (see [§3.4.1](#341-approval-rules-engine)) configured independently per tenant.
- Custom person fields (e.g. clan, gotra, ancestral village, parish) defined per tenant.
- Feature toggles: enable/disable comments, stories, authenticated share links, cross-tenant linking, directory listing.

### 11.4 Tenant Lifecycle
- Provisioning, suspension, and deletion with a 30-day recovery window before hard purge.
- Quotas per tenant: members, persons, media storage, API rate limits.
- Tenant transfer: an Owner may hand ownership to another member.
- Tenant merge: two tenants that discover they are the same family can merge, via an admin-reviewed duplicate-matching workflow.
- Tenant split: a branch can be spun out into its own tenant, retaining a cross-tenant link to the parent tree.

### 11.5 Self-Hosting
- Single-tenant mode for families who self-host: same codebase, one tenant, tenancy UI hidden.
- Multi-tenant mode for community/shared hosting, with an Instance Operator console.
- No feature is gated behind a hosted-only tier — the open-source build is fully functional.

---

## 12. Cross-Tenant Linking (Marriage & Shared Relatives)

When a member of Family A marries a member of Family B, both trees should reflect the
union without either family losing control of its own records.

### 12.1 Concepts
- **Home tenant** — the tenant that owns a person record and is the authority for its data.
- **Linked person** — a read-through reference in another tenant, pointing at the person in their home tenant.
- A person is never duplicated across tenants; the link is a reference, not a copy.
- **Cross-tenant relationship** — a relationship edge whose two endpoints live in different tenants (marriage, parent–child after a split, adoption across families).

### 12.2 Link Request Flow
1. **Initiate** — a member in Tenant A adds a spouse and chooses "This person is in another family tree" → searches by invite code, share link, or a consented directory lookup.
2. **Request** — Tenant A sends a link request naming both persons, the relationship type, and the requested sharing scope.
3. **Consent** — the request requires approval from **both** the linked person (if they have a claimed account) **and** a Tenant Owner/Admin on the receiving side. Dual consent is mandatory — no unilateral linking.
4. **Scope negotiation** — the receiving tenant chooses what to expose (see [§12.3](#123-sharing-scopes)); the requesting tenant sees only what is granted.
5. **Establish** — the link goes live; both trees render the connection with a visual "linked family" badge.
6. **Review** — links are revocable at any time by either side, with a grace-period notice before takedown.

### 12.3 Sharing Scopes
Granular, per-link, and independently set by each side:

| Scope | Shared with the other tenant |
| --- | --- |
| **Minimal** | Name, photo, and the relationship edge only |
| **Profile** | Minimal + birth year, life events, biography |
| **Extended** | Profile + immediate family (parents, siblings, children) as linked references |
| **Branch** | Extended + traversal up to *N* generations into the linked tree |
| **Full** | Complete read access to the counterpart tree |

- Field-level privacy settings ([§6](#6-privacy--safety)) always apply on top — the narrower of the two wins.
- Contact details and documents are never shared by default at any scope.
- Scopes can be asymmetric: Tenant A may grant Branch while Tenant B grants only Minimal.

### 12.4 Editing Across Tenants
- Linked persons are **read-only** in the guest tenant; editing always redirects to the home tenant.
- A guest tenant may submit a **cross-tenant change proposal**, which enters the home tenant's normal approval queue ([§3.4](#34-change-proposal-flow)) tagged with its origin tenant.
- Children of a cross-tenant marriage: the **home tenant defaults to the father's tenant**. The other tenant holds linked references. The designation is explicitly switchable at any time — at link time, at child creation, or later — by mutual consent of both Tenant Owners (and the child, once they claim their profile).
- Where no father record exists, or the father is unlinked, the home tenant defaults to the creating tenant.
- Switching a child's home tenant migrates ownership and history; the prior home tenant retains a linked reference and the move is recorded in both audit logs.
- Conflict resolution: the home tenant is always the source of truth; guest-side edits never overwrite silently.

### 12.5 Navigation & UX
- A linked person's card shows a clear badge: "Also in the **Menon** family tree".
- Tapping a linked person shows the shared subset inline, with an explicit "View in their tree" action that requires access (or shows a request-access prompt).
- Tree view renders cross-tenant edges in a distinct style (e.g. dashed connector + tenant color chip).
- The relationship calculator traverses granted cross-tenant links: "Your wife's maternal uncle."
- Unified search can optionally span tenants the user belongs to, with clear per-result tenant attribution.
- A single **"My families"** switcher lists every tenant the user belongs to, with pending invites and link requests surfaced.

### 12.6 Trust & Safety
- All cross-tenant traffic is authorized per-request against the negotiated scope — the scope is enforced server-side, never assumed from the client.
- Every cross-tenant read of a protected field is logged and visible to the home tenant's admins.
- Revoking a link immediately invalidates cached data and signed media URLs on the other side.
- Rate limits and abuse reporting apply to link requests to prevent link-spam / enumeration of families.
- Deceased-only linking mode: a tenant may allow cross-tenant exposure of deceased ancestors only.

### 12.7 Opt-In Family Directory
- A cross-tenant directory that helps families **find each other in order to request a link** — opt-in per tenant, off by default.
- **Minimal listing only**: family/tenant display name, surname(s) and known name variants, ancestral region/place, approximate earliest-generation era, an optional crest/photo, and a contact/request button. Nothing more.
- **No person-level PII in the directory**: no individual names, dates, relationships, or member counts — it identifies a *family*, not people.
- Requires authentication to browse ([§6.1](#61-login-gated-access)); not indexed by search engines.
- Search by surname, place, and era, with fuzzy/phonetic matching for regional spelling variants.
- "Request a link" from a directory entry opens the standard dual-consent flow ([§12.2](#122-link-request-flow)) — discovery never grants access on its own.
- Tenant Owners control the listing text, can delist instantly, and can disable inbound requests while staying listed.
- Anti-abuse: per-user request quotas, cooldown after refusals, blocklists, and reporting.
- Linking is also always possible **without** the directory, via a private invite code or share link.

### 12.8 Cross-Instance Federation
**In scope.** Federation is a first-class capability, not a stretch goal.
- Two independently self-hosted instances can link families using the same dual-consent and sharing-scope model as in-instance tenants.
- Server-to-server protocol: signed, authenticated HTTP using **HTTP Message Signatures (RFC 9421)**, with instance actor documents and key discovery (ActivityPub-inspired).
- Instances exchange capability metadata (supported scopes, schema version) during handshake; version negotiation keeps older peers working.
- Per-instance allowlist/blocklist and an operator-level federation policy; an instance may run fully closed.
- Remote data is cached with a TTL and revalidated; revocation propagates immediately and purges caches and signed URLs on the peer.
- Federated identity: a user may authenticate on their home instance and be recognized on a peer through OIDC-based instance-to-instance trust — login is still required, satisfying [§6.1](#61-login-gated-access).
- Federation audit: every remote read and write is logged on both sides and visible to the home tenant's admins.
- Graceful degradation: if a peer is unreachable, linked persons render from cache with a "last synced" indicator rather than erroring.

---

## 13. Open Source & Open Standards

### 13.1 Project & Licensing
- **License: Apache-2.0** for the entire project — server, clients, SDKs, and the design system. Chosen to maximize adoption, allow commercial and self-hosted use without friction, and provide an explicit patent grant.
- Contributor Covenant Code of Conduct; DCO sign-off on commits (no CLA).
- `NOTICE` file maintained; all dependencies must be Apache-2.0-compatible (MIT, BSD, ISC, Apache-2.0) — no copyleft dependencies in the distributed artifacts.
- Public roadmap, issue tracker, and RFC process for breaking changes.
- `CONTRIBUTING.md`, `SECURITY.md` (coordinated disclosure), and [`ARCHITECTURE.md`](ARCHITECTURE.md) \u2014 stack, data architecture, and ADRs.
- Reproducible dev setup: one-command bootstrap (`docker compose up`), seeded demo tenant with synthetic data.
- Published container images, Helm chart, and a one-click self-host guide.
- Semantic versioning with a documented upgrade/migration path and LTS branches.
- Build only on permissively licensed dependencies; SBOM published per release.
- i18n via a community translation platform (e.g. Weblate) — translations are contributions, not a paid feature.
- Plugin/extension points for custom fields, importers, auth providers, and storage backends.

### 13.2 Interoperability Standards

| Domain | Standard | Usage |
| --- | --- | --- |
| Genealogy data | **GEDCOM 7.0** | Primary import/export format |
| Genealogy data | **GEDCOM 5.5.1** | Legacy import from older desktop tools |
| Genealogy data | **GEDCOM-X** (JSON/XML) | API-friendly exchange; conclusion/evidence model |
| Genealogy data | **GEDZIP** | Bundled export of records + media |
| Linked data | **schema.org `Person`** in JSON-LD | Semantic export for downstream tools (authenticated export only — not published) |
| Linked data | **FOAF / RDF** | Optional RDF serialization for researchers |
| Identifiers | **Persistent tenant-scoped URIs + optional external IDs** (FamilySearch, WikiTree, Geni, Wikidata Q-IDs) | Cross-system person reconciliation |
| Dates/places | **ISO 8601** (incl. approximate/range dates), **GeoNames** IDs, WGS-84 coordinates | Unambiguous dates and places |
| Media | **EXIF / XMP / IPTC** | Preserve photo metadata and face-region tags on import/export |
| Documents | **PDF/A**, **METS/ALTO** (optional) | Long-term archival of scanned records |
| Auth | **OAuth 2.1 + OIDC**, **WebAuthn/Passkeys**, **SAML 2.0** (optional) | Bring-your-own identity provider |
| Provisioning | **SCIM 2.0** | Bulk member provisioning for large tenants |
| API | **OpenAPI 3.1** REST + optional GraphQL; **JSON:API** conventions; **RFC 9457** problem details for errors | Documented, generated client SDKs |
| Events | **CloudEvents 1.0** over webhooks | Notify external tools of tree changes |
| Federation | **ActivityPub-inspired** signed server-to-server protocol (**HTTP Message Signatures, RFC 9421**) | Cross-instance family linking |
| Calendar | **iCalendar (RFC 5545)** feed | Birthdays and anniversaries in any calendar app |
| Contacts | **vCard 4.0** | Export family contact cards |
| Accessibility | **WCAG 2.2 AA**, **ARIA 1.2** | Verified in CI with automated audits |
| Privacy | **GDPR / DPDP** data subject rights, **DPV** vocabulary | Export, erasure, and consent records |
| Observability | **OpenTelemetry** | Traces/metrics for self-hosters |

### 13.3 Public API & Integrations
- Fully documented public API covering everything the web UI does — no private endpoints.
- Per-tenant API keys and OAuth apps with scoped, revocable tokens.
- Webhooks for person created/updated, proposal submitted/approved, cross-tenant link changed.
- Reference integrations: GEDCOM desktop tools (Gramps, RootsMagic), FamilySearch/WikiTree ID matching, calendar subscriptions, and DNA-tool CSV match import.
- Import/export adapters are plugins, so the community can add formats without forking.

---

## 14. Engagement & Retention

A family tree is naturally a *write-once, read-rarely* artifact. Without a deliberate
return loop the app is abandoned after the initial burst of data entry. These features
exist to generate fresh content continuously and give members a reason to come back.

### 14.1 The Return Loop (highest priority)
- **On this day** \u2014 "42 years ago today, your parents married." A daily, zero-effort reason to open the app.
- **Memory prompts** \u2014 a rotating weekly question sent to members ("What was your first job?", "Describe your childhood home"), answerable by **voice in one tap**, auto-attached to their profile. This is the primary mechanism for capturing oral history from elders before it is lost.
- **Tree completeness meter** per branch ("Your maternal line is 60% complete") with **missing-info quests**: "3 people need a birth year \u2014 you may know these."
- **Family newsletter** \u2014 auto-generated monthly digest of births, marriages, new photos, and new stories, delivered by email/WhatsApp. Passive re-engagement for members who never open the app.
- Every notification asks for a contribution rather than merely informing: "It's Grandma's birthday \u2014 add a memory of her?"

### 14.2 Emotional Hooks
- Anniversary, birthday, and death-remembrance reminders with a one-tap tribute action.
- Then-and-now photo pairs (same place or pose across generations).
- Time capsule: write a letter to a descendant, unlockable on a future date.
- Memorial tribute wall for deceased members.
- Resemblance view ("you look most like your maternal grandfather") \u2014 **opt-in only**, see [\u00a714.6](#146-consent-boundaries).

### 14.3 Discovery & Delight
- Migration map: animated ancestral movement over time.
- Family statistics: oldest living member, average lifespan, generation count, largest sibling group, most common names by era.
- Weekly ancestor spotlight \u2014 doubles as a prompt to fill that profile's gaps.
- Living-relative count: "You have 47 living relatives in this tree."
- "How are we related?" rendered as a shareable card.
- Surname and name-origin insights.

### 14.4 Light Gamification
- Contribution milestones and badges (Historian, Photo Keeper, Storyteller), aligned with the trust ladder in [\u00a73.2](#32-verified-contributors).
- Contributor leaderboard per tenant, opt-out per user.
- Branch completeness progress, framed as helping the family rather than competing.
- **No streaks or loss-framing** \u2014 guilt mechanics are hostile to elder users and to a multi-decade artifact.

### 14.5 Content Depth
- Family events module: reunions, weddings, funerals with RSVP, shared album, and a post-event tagging prompt.
- Recipe, tradition, and heirloom archive, attributed to a person.
- Per-branch notice board or group chat.
- Voice memories with transcription; AI photo restoration/colorization (originals always retained, enhanced versions clearly marked); document OCR with field extraction into the profile.
- Auto-generated slideshow / "family film" from a person's media.
- Printed family book, poster, and QR-coded memorial cards as export artifacts.
- Shareable image cards for milestones \u2014 these share a *picture*, never data, preserving [\u00a76.1](#61-login-gated-access).

### 14.6 Consent Boundaries
- Face detection, resemblance analysis, AI photo enhancement, and DNA import touch **biometric and health data** and carry heavier legal weight than the rest of the tree.
- All of these are **off by default, explicit opt-in per user**, revocable, and excluded from cross-tenant sharing unless separately granted.
- Biometric derivatives are deleted on opt-out; no biometric data leaves the tenant or crosses federation boundaries.

---

## 15. Social & Messaging Integration

Elders live in **WhatsApp**; younger members live in **Instagram, Snapchat, and short-form
video**. Meeting each cohort in the app they already open is the cheapest path to both
acquisition and retention. The binding constraint: integration must never breach
[§6.1 Login-Gated Access](#61-login-gated-access) \u2014 we push *invitations and teasers* outward, never PII.

### 15.1 Non-Negotiable Boundaries
- **No PII in any outbound message body.** "A record you follow was updated" \u2014 never the name, date, or relationship. Detail lives behind an authenticated deep link.
- **Nothing auto-posts.** No integration ever publishes to a social platform without an explicit, per-post human action.
- Sharing a *living* member's photo or details to any external platform requires that member's consent; minors are never shareable externally.
- Outbound share assets are **rendered images**, not data \u2014 a picture leaks nothing queryable.
- Every channel is independently opt-in and one-tap revocable; revoking deletes stored tokens immediately.
- Social connections are a convenience layer \u2014 the app must remain fully usable with none of them enabled.

### 15.2 WhatsApp (primary channel for elders)
- **WhatsApp Business Cloud API** integration with approved message templates.
- Opt-in per member with verified phone number; unsubscribe by replying **STOP**.
- Message types: birthday and anniversary reminders, memory prompts, approval requests for tenant admins, monthly newsletter teaser, and invite delivery.
- **Reply-to-contribute** \u2014 the highest-value mechanic here: a member replies to a prompt with a **voice note, photo, or text**, and it is attached to their profile as a pending suggestion. Elders contribute without ever opening the app or learning the UI.
  - Replies enter the normal approval queue ([§3.4](#34-change-proposal-flow)); verified contributors' replies apply directly.
  - Inbound media is virus-scanned, size-limited, and stripped of location EXIF before storage.
- **Invite via WhatsApp** \u2014 share a scoped invite link or QR into an existing family group chat. This is how most trees will actually grow.
- Session-window awareness and template-vs-session message handling to stay within platform policy.
- Deep links open the app (or PWA) directly to the relevant screen, prompting login first.

### 15.3 Other Messaging Channels
- **Telegram** bot with the same prompt-and-reply contribution flow.
- **SMS** fallback for members with no smartphone \u2014 reminders and magic-link sign-in only.
- **Email** digests remain the universal baseline.
- **Signal / RCS** as optional community-contributed adapters.
- Per-member channel preference and quiet hours; a single daily cap across all channels to prevent notification fatigue.

### 15.4 Instagram & Social Content Import
- Connect Instagram, Facebook, or Google Photos with OAuth; scopes limited to reading the member's **own** content.
- **Selective import**, never bulk auto-sync: the member picks posts/photos to attach to their profile timeline or a family event.
- Imported items retain caption, date, and location (location optional and strippable) and are marked with their source.
- Photo suggestion: "You posted 12 photos on the day of the reunion \u2014 add any to the family album?"
- Profile photo import on signup to reduce onboarding friction.
- Disconnecting a social account leaves already-imported content in place (it is now family history) but revokes further access.
- Adapters are plugins ([§13.3](#133-public-api--integrations)) so the community can add platforms without forking.

### 15.5 Outbound Sharing (privacy-safe by construction)
- **Share cards**: server-rendered images for milestones \u2014 "Our family just reached 5 generations", a relationship card, a then-and-now pair, a birthday tribute.
- Formats sized for each destination: square feed, 9:16 story/reel, and link-preview.
- Consent gate before rendering: any living person appearing in a card must have consented; non-consenting members are omitted or blurred automatically.
- Cards carry a subtle family/app watermark and an invite link \u2014 sharing doubles as acquisition.
- **Family Reel generator**: auto-assembles a short vertical video from event photos with music, exportable to Reels/Stories/Shorts. This is the single strongest hook for younger members.
- Share targets: WhatsApp status, Instagram, Facebook, X, Snapchat, Threads, or a plain image download \u2014 all via the native share sheet, so we never hold posting permissions.

### 15.6 Engaging Younger Members
- Mobile-first, vertical, media-led surfaces \u2014 a swipeable **family stories feed** rather than a form-heavy tree.
- Emoji reactions and short comments on photos and stories.
- Collaborative event albums: everyone drops photos from a wedding or reunion into one place, then tags people.
- "Guess who?" \u2014 a light photo quiz surfacing old family pictures; entertaining, and it harvests tags as a side effect.
- Ancestor-resemblance and "which relative are you most like" cards, shareable and opt-in ([§14.6](#146-consent-boundaries)).
- Push notifications with a social framing: "Your cousin added a photo of your grandfather."
- Younger members are the natural **digitizers** \u2014 give them a "scan an old photo" flow and credit them as contributors ([§14.4](#144-light-gamification)).

### 15.7 Identity & Authentication Linking
- Social sign-in (Google, Apple, Facebook) alongside phone OTP and magic links ([§2.1](#21-authentication--onboarding)).
- A social account link is an **authentication convenience only** \u2014 it never grants the platform access to tree data and never exposes the tree to the platform's graph.
- Phone-number matching for invites is opt-in and consent-based; we do not upload contact books.
- Clear per-member screen listing connected accounts, the data each can access, and a one-tap disconnect.

### 15.8 Compliance & Operational Guardrails
- Platform terms and rate limits respected per channel; template approval tracked per locale.
- OAuth tokens encrypted at rest, tenant-scoped, short-lived, and refreshed server-side; never exposed to the browser.
- Webhook endpoints signature-verified; inbound payloads treated as untrusted input.
- Messaging costs are metered per tenant with quotas, so a self-hoster is not surprised by a WhatsApp bill.
- **Self-hosters supply their own provider credentials** per tenant; no integration depends on a central service we control.
- Consent, opt-in, and opt-out events are recorded in the audit log for regulatory evidence.
- Graceful degradation: if a provider is unavailable or unconfigured, the app falls back to email/in-app notifications without error.

---

## 16. Risks & Mitigations

Most family tree products fail for product and community reasons, not technical ones.
These risks are ranked by how often they kill comparable projects.

### 16.1 Product Risks

| # | Risk | Why it kills projects | Mitigation |
| --- | --- | --- | --- |
| R1 | **Cold start** \u2014 an empty tree has no value until ~50\u2013100 people are entered | The burden falls on one person; the second user never has a reason to arrive | GEDCOM 7.0 import from day one; invite flow that pre-links the invitee to a node; seed-by-interview wizard; show value at 5 people, not 500 |
| R2 | **No reason to return** \u2014 trees are write-once, read-rarely | Engagement collapses after the initial data-entry burst | [\u00a714.1](#141-the-return-loop-highest-priority) return loop: On This Day, memory prompts, completeness quests, monthly newsletter |
| R3 | **Single-keeper dependency** | One relative maintains everything; when they stop, the tree freezes | Open contribution ([\u00a73.1](#31-contribution-model)), multiple verified contributors per branch, branch moderators, mandatory second admin per tenant |
| R4 | **Data entry is miserable for the people who hold the knowledge** | Elders bounce off the UI; those who can use the tool lack the information | Elder-first UI ([\u00a78.4](#84-elder-specific-affordances)), voice input, partial dates, one-question-per-step forms, Simple mode |
| R5 | **Value is deferred by decades** | "Your grandchildren will treasure this" does not motivate weekly use | Immediate payoffs: stats, relationship cards, photo restoration, shareable milestones |
| R6 | **Privacy anxiety among living relatives** | One objecting member can socially shut the project down | Strict login-gating ([\u00a76.1](#61-login-gated-access)), per-field visibility, right to be forgotten, consent prompts before tagging |
| R7 | **Correctness disputes** \u2014 remarriage, adoption, estrangement, contested dates | Arguments drive people away when there is no resolution model | Approval workflow with evidence attachments, version history, moderator arbitration, source citations and confidence levels |
| R8 | **Fragmentation** \u2014 branches use different tools | Nothing reconciles; effort is duplicated | Cross-tenant linking ([\u00a712](#12-cross-tenant-linking-marriage--shared-relatives)), federation ([\u00a712.8](#128-cross-instance-federation)), GEDCOM/GEDCOM-X interop |

### 16.2 Open-Source Sustainability Risks

| # | Risk | Why it kills projects | Mitigation |
| --- | --- | --- | --- |
| R9 | **Solo-maintainer burnout** | Nearly all genealogy OSS is one person; archived repos are the norm | Governance and a second maintainer with commit rights before v1 ships; documented succession; clear "good first issue" pipeline |
| R10 | **Tiny, aging contributor pool** | The genealogist \u2229 developer overlap is small | Mainstream, boring tech choices; one-command dev setup; non-code contribution paths (translation, docs, design, data curation) |
| R11 | **GEDCOM is a swamp** | Vendor-divergent 5.5.1 implementations consume all maintainer energy for no visible features | Scope ruthlessly: **GEDCOM 7.0 supported properly; 5.5.1 is best-effort import only**; never promise lossless round-trip with arbitrary vendors; extension block preserves unmapped fields |
| R12 | **Deceptively hard domain model** | Naive schemas hit a wall at adoption, multiple marriages, unknown parentage, cultural naming, uncertain dates \u2014 and the rewrite never happens | Adopt the GEDCOM-X **evidence vs. conclusion** split in the core model from day one; model relationships as first-class edges with types, not parent columns |
| R13 | **Self-hosting friction** | "Install PHP and a database" means the non-technical relatives never arrive, so the user base stays at one and feedback starves | **Offer a hosted option from day one**, including a free community instance; self-hosting remains fully supported but is never the only path |
| R14 | **Desktop-era architecture** | Retrofitting mobile and real-time collaboration onto an old codebase is infeasible | Mobile-first, API-first, PWA from the start |
| R15 | **No funding model** | Media hosting costs are real and recurring; someone pays out of pocket until they stop | Sponsorship, donations, optional paid hosting and printed-book revenue \u2014 **never gate features in the OSS build** ([\u00a711.5](#115-self-hosting)) |
| R16 | **No governance / bus factor of one** | No commit rights, no succession, project dies with the maintainer | Published governance doc, \u22652 maintainers, transparent RFC process, data portability so users are never trapped |

### 16.3 Guiding Conclusion
> These projects die from lack of **users**, not lack of **features**.
> Zero-friction onboarding (R1, R13) and the engagement loop (R2) outrank every other
> item in this specification. A feature that does not serve acquisition, contribution,
> or retention should lose to one that does.

**Leading indicators to track:** time-to-first-10-people, share of members who are *not*
the tenant creator, 30-day contributor retention, proportion of profiles with a story or
photo, and number of active verified contributors per tenant.

---

## 17. Suggested Release Plan

> Detailed iteration-by-iteration planning lives in [ROADMAP.md](ROADMAP.md).

### MVP (v1)
Multi-tenant foundation (tenant model + RLS isolation) · login-gated access end to end · auth + invites · person profiles · parent/child/spouse relationships (evidence/conclusion model) · tree view (pedigree + descendants) · search · open suggestion flow for any authenticated user · verified-contributor bypass · approval queue with diffs · audit history + recent-changes feed · responsive accessible UI · privacy tiers · GEDCOM 7.0 import/export · **On This Day + memory prompts with voice capture** · **WhatsApp invites + reminders (no PII in message bodies)** · **hosted free tier alongside the self-host guide** · repo published under Apache-2.0 with CoC, governance doc, and ≥2 maintainers.

### v2
Cross-tenant linking with dual consent and sharing scopes · father's-tenant default with switchable designation · tenant switcher · opt-in family directory · media galleries · comments & stories · notifications and digests · **completeness meter + missing-info quests** · **auto-generated family newsletter** · **WhatsApp reply-to-contribute (voice/photo → pending suggestion)** · **share cards with consent gating** · social sign-in · family events module · duplicate merge · branch moderators · relationship calculator · contributor reputation, badges, and auto-promotion · public OpenAPI + webhooks.

### v3
Cross-instance federation (RFC 9421 signed S2S, instance allowlists, federated identity) · PWA/offline · approval rules engine · GEDCOM-X + JSON-LD export · tenant merge/split · authenticated share links · migration map & family statistics · Instagram/Google Photos selective import · Family Reel generator · stories feed with reactions · Telegram bot · opt-in AI media features (restoration, face tagging, resemblance) · printed family book · multi-language · simple mode · analytics dashboard · plugin system.

---

## 18. Decisions Made

| Question | Decision |
| --- | --- |
| Who may edit? | Wikipedia-style — **any authenticated user may suggest** changes to any visible record; all suggestions require approval ([§3.1](#31-contribution-model)) |
| Can approval be skipped? | Yes, for **verified contributors**, scoped to their associated tree/branch ([§3.2](#32-verified-contributors)) |
| Anonymous access? | **None.** No PII or tree data without login ([§6.1](#61-login-gated-access)) |
| Home tenant for cross-tenant children? | **Father's tenant by default**, switchable by mutual consent ([§12.4](#124-editing-across-tenants)) |
| Cross-instance federation? | **In scope** — first-class, targeted for v3 ([§12.8](#128-cross-instance-federation)) |
| License? | **Apache-2.0** across the whole project ([§13.1](#131-project--licensing)) |
| Family discovery? | **Opt-in directory** with family-level minimal info only; linking still requires dual consent ([§12.7](#127-opt-in-family-directory)) |
| Social platforms? | **Rich integration, one-way-safe** — WhatsApp-first for elders, Instagram/Reels-style sharing for the young; outbound content is rendered images and teaser links only, never PII ([§15](#15-social--messaging-integration)) |

### Still Open
- Default auto-approval window when no reviewer responds — and whether it should be enabled by default at all.
- Thresholds for automatic promotion to verified contributor (accepted-edit count, clean-record window).
- Media storage limits per member and per tenant.
- Whether suggestions from users with no relationship to a tree should be rate-limited more aggressively than related members.
- Who funds WhatsApp Business API message costs on the hosted tier — free-tier quota, or elder-reminders only?
- Should the hosted service run a shared WhatsApp sender, or require each tenant to bring its own number?
- Daily notification cap per member across all channels — what is the default?
