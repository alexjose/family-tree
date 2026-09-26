## Related issue

Closes #

## What changed

<!-- 2–5 plain-language sentences. What a reviewer needs to know, not a file list. -->

## Acceptance criteria

<!-- Copy verbatim from the issue. Tick only what is demonstrably true, with evidence. -->

- [ ]

## Quality gates

<!-- All must pass locally before requesting review. -->

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm test`

## Definition of Done

<!-- Required for user-facing changes. Tick N/A below if this PR has no UI. -->

- [ ] Not a user-facing change — section not applicable
- [ ] Responsive at 360px, 768px, and 1280px
- [ ] Keyboard navigable with a visible focus ring
- [ ] Zero `axe-core` violations on the touched flow
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 UI; touch targets ≥ 48×48px
- [ ] Labels in plain language; icons never unlabeled
- [ ] Loading, empty, and error states designed
- [ ] Destructive actions confirmed and undoable
- [ ] Works at 200% zoom and with OS large-text settings
- [ ] Screenshots attached (mobile and desktop)

## Data and security

- [ ] No schema change in this PR
- [ ] New tables have RLS policies **and** pgTAP isolation tests
- [ ] Server-side authorization enforced, not just hidden in the UI
- [ ] No secrets, `.env` files, or real personal/family data committed
- [ ] New runtime dependencies are Apache-2.0 compatible (`pnpm check:licenses`)

## Out of scope / follow-ups

<!-- Anything found but not fixed here, and the issue it should become. "None" if none. -->

## Notes for the reviewer

<!-- Trade-offs taken, decisions worth a second opinion, areas needing careful review. -->

---

- [ ] Commits are conventional and signed off (`git commit -s`)
