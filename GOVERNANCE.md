# Governance

This document exists because most open-source genealogy projects die with a single
maintainer. Explicit roles, decision rules, and a succession plan are how we avoid that.

## Roles

### Contributor

Anyone who opens an issue, submits a pull request, writes documentation, translates, or
reports usability problems. No formal process — just participate.

### Maintainer

Contributors with commit rights. Maintainers review and merge pull requests, triage
issues, cut releases, and steward the roadmap.

**Becoming a maintainer:** sustained, quality contribution over time and good judgement in
review. Existing maintainers nominate; approval requires consensus of current maintainers.

**Stepping down:** maintainers may step down at any time and are listed as emeritus.
Maintainers inactive for 12 months may be moved to emeritus by the remaining maintainers,
and can return on request.

### Current maintainers

| Name      | GitHub                                   | Areas                                            |
| --------- | ---------------------------------------- | ------------------------------------------------ |
| Alex Jose | [@alexjose](https://github.com/alexjose) | Project lead, architecture                       |
| _Vacant_  | —                                        | **Second maintainer required before v1.0 ships** |

> A single maintainer is the project's largest sustainability risk. Recruiting a second
> maintainer with full commit rights is a release blocker for v1.0, not a nice-to-have.

## Decision making

Most decisions are made through normal pull request review — propose, discuss, merge.

**Lazy consensus** applies to routine changes: if no maintainer objects within a
reasonable period, the change proceeds.

**Explicit agreement** is required for:

- Changes to the license, governance, or code of conduct
- Breaking changes to the data model, public API, or federation protocol
- Adding a runtime dependency with an unusual license
- Adding or removing a maintainer
- Architectural decisions that supersede an existing ADR

Where maintainers disagree and discussion does not resolve it, the project lead decides
and records the reasoning in an ADR.

## Architecture decisions

Significant technical decisions are recorded as ADRs in `docs/adr/`, summarized in
[ARCHITECTURE.md](ARCHITECTURE.md). An ADR is superseded, never silently rewritten.

## Roadmap

The roadmap lives in [ROADMAP.md](ROADMAP.md) and is tracked on the project board.
Iteration scope is set by maintainers, informed by design-partner families. Anyone may
propose items.

Priority follows one rule: **onboarding friction and engagement outrank everything else.**
A feature that does not serve acquisition, contribution, or retention loses to one that does.

## Releases

Semantic versioning. Patch releases for fixes and security, minor for features, major for
breaking changes. Every release documents its upgrade path. Maintainers cut releases;
security fixes may be released immediately.

## Succession and continuity

The project must survive the loss of any individual:

- At least two maintainers with full commit rights at all times
- No single person holds exclusive access to infrastructure, registry, or domain accounts
- Credentials and recovery details are shared among maintainers, documented privately
- Users can export their complete data at any time, so no one is trapped if the project stalls
- If all maintainers become inactive for 12 months, the repository is marked unmaintained
  and the community is invited to fork under the same Apache-2.0 terms

## Funding

Operating costs (hosting, media storage, messaging) are real and recurring. Funding may
come from sponsorship, donations, optional paid hosting, or printed-book sales.

**Funding never gates features.** The open-source build is always fully functional and
self-hostable, with no feature reserved for a paid tier.

## Changing this document

Changes to governance require a pull request and explicit agreement from all current
maintainers.
