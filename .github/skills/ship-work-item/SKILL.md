---
name: ship-work-item
description: "Implement a work item from the family-tree GitHub Project (#6) end to end: pick the item, create a feature branch, implement it against its acceptance criteria, run every quality gate, and open a pull request that only merges once all checks pass. Use when asked to start, implement, build, or ship a work item, backlog item, project card, or issue; when asked to 'do the next item'; or when asked to open a PR for completed work-item work."
argument-hint: "Work item title, number, or 'next' to pick the top unstarted item"
---

# Ship a Work Item

End-to-end workflow for turning one GitHub Project work item into a merged-ready pull
request. One item → one branch → one PR. Never batch multiple items into a branch.

**Repository context**

| Thing           | Value                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Repo            | `alexjose/family-tree`                                                                                                |
| Project board   | https://github.com/users/alexjose/projects/6 (user project, number `6`)                                               |
| Default branch  | `main`                                                                                                                |
| Package manager | pnpm 10 via corepack (never `npm` or `yarn`)                                                                          |
| Specs           | [FEATURES.md](../../../FEATURES.md) · [ARCHITECTURE.md](../../../ARCHITECTURE.md) · [ROADMAP.md](../../../ROADMAP.md) |

---

## Step 1 — Select and confirm the item

```bash
gh project item-list 6 --owner alexjose --format json --limit 60
```

- If the user named an item, match on title. If they said "next", propose the first
  unstarted item respecting the dependency order in ROADMAP I0, and **confirm before starting**.
- Read the item body in full. Its **Scope** checklist and **Acceptance criteria** are the
  contract — do not expand beyond them.
- If the item declares `### Depends on`, verify those are done. If not, say so and stop.
- Restate the scope in one or two sentences and get agreement before writing code.

## Step 1.5 — Convert the draft item to a real issue

Board items are created as **draft issues**, which have no issue number and cannot be
auto-closed by a PR. Convert before branching so the work is properly traceable.

```bash
REPO_ID=$(gh repo view alexjose/family-tree --json id -q .id)

gh api graphql -f query='
  mutation($itemId:ID!, $repositoryId:ID!) {
    convertProjectV2DraftIssueItemToIssue(input:{itemId:$itemId, repositoryId:$repositoryId}) {
      item { content { ... on Issue { number url } } }
    }
  }' -f itemId="<item-id-from-step-1>" -f repositoryId="$REPO_ID"
```

- The converted issue keeps the item's title and body, so acceptance criteria travel with it.
- Record the issue number — it is needed for `Closes #N` in Step 6.
- If the item is already a real issue, skip this step.

## Step 2 — Branch

Always branch from an up-to-date `main`. Never commit directly to `main`.

```bash
git checkout main && git pull --ff-only origin main
git checkout -b <type>/<short-kebab-summary>
```

`<type>` matches the change: `feat`, `chore`, `fix`, `refactor`, `docs`, `test`, `ci`.
Example: `chore/monorepo-scaffold`, `feat/rls-policies`, `test/pgtap-tenant-isolation`.

## Step 3 — Implement

- Follow [ARCHITECTURE.md](../../../ARCHITECTURE.md). The `packages/core` boundary is
  non-negotiable: no Next.js, Supabase, Hono, Drizzle, or I/O imports in the domain layer.
- Work the Scope checklist in order. Keep changes inside the item's scope; note anything
  discovered for a follow-up item rather than fixing it here.
- Write the tests alongside the code — a PR with no tests fails review unless the item is
  purely configuration.
- Any new database table requires an RLS policy **and** a pgTAP isolation test in the same PR.

## Step 4 — Quality gates (all must pass locally)

Run in this order and fix before proceeding:

```bash
pnpm install
pnpm format:check   # pnpm format to fix
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

For any user-facing change, also verify the [Definition of Done](../../../ROADMAP.md)
checklist from ROADMAP §2 — responsive at 360/768/1280, keyboard navigable, zero axe
violations, 48px touch targets, designed empty/loading/error states, undoable destructive
actions, server-side authorization. **Accessibility and data-integrity failures block the
PR; nothing else does.**

If a gate fails, fix the cause. Never disable a rule, skip a test, or use `--no-verify`.

## Step 5 — Commit

Commits must satisfy the local hooks: Conventional Commits + DCO sign-off.

```bash
git add -A
git commit -s -m "<type>(<scope>): <imperative summary>"
```

Allowed scopes: `core`, `db`, `ui`, `api`, `adapters`, `gedcom`, `web`, `worker`, `infra`,
`docs`, `deps`, `repo`.

The `-s` flag is mandatory — the `commit-msg` hook rejects commits without a
`Signed-off-by` trailer. Never bypass hooks.

## Step 6 — Open the pull request

```bash
git push -u origin HEAD
gh pr create --base main --title "<type>(<scope>): <summary>" --body-file <tmp-body>
```

Build the PR body from [the template](./references/pr-body-template.md). It must contain:

1. Link to the project item (title, and issue URL if it was converted from a draft)
2. What changed and why, in plain language
3. **The item's acceptance criteria copied verbatim as a checklist**, each ticked with
   evidence (command output, screenshot, test name)
4. Gate results: format, lint, typecheck, build, test — and axe/Lighthouse if user-facing
5. Anything deliberately out of scope, with a follow-up note
6. `Closes #<issue>` when a real issue exists

Mark the PR **draft** if any gate is still failing or the work is incomplete.

## Step 7 — Verify checks, then hand off

```bash
gh pr checks --watch
```

- **A PR is only acceptable when every check is green.** If CI fails, push fixes to the
  same branch and re-check. Do not merge, and do not ask for merge, while anything is red.
- Report the PR URL and check status to the user.
- Move the project item to the review/done column if a Status field exists:
  `gh project item-edit --id <item-id> --project-id <project-id> --field-id <field> --single-select-option-id <option>`
- **Stop here. Never merge, and never enable auto-merge.** The user merges manually.
  Report "all checks green, ready for your review" and end the turn.

> **Branch protection:** once the CI pipeline exists (work item _CI pipeline: lint,
> typecheck, test, accessibility, security scanning_), `main` gets protected with required
> status checks and a required PR. Until then, the no-merge-while-red rule is enforced by
> this skill rather than by GitHub — so follow it strictly.

---

## Rules

- One item per branch per PR. If scope grows, open a new item instead of widening the PR.
- Never force-push a shared branch, never `git reset --hard` with uncommitted work, never
  `--no-verify`.
- Never commit secrets, `.env` files, or real personal/family data. Test fixtures are synthetic.
- If the item's acceptance criteria turn out to be wrong or impossible, stop and raise it
  rather than quietly changing them.
- Keep the project board honest: if you stop mid-item, say so in the item or the PR.
- Merging is always the user's decision. Do not merge, squash, or enable auto-merge.

## Completion checklist

- [ ] Draft item converted to a real issue; issue number recorded
- [ ] Branch created from current `main`, named `<type>/<summary>`
- [ ] Every Scope box in the work item addressed or explicitly deferred
- [ ] Every acceptance criterion demonstrably met
- [ ] All local gates green
- [ ] Commits conventional and signed off (`-s`)
- [ ] PR opened with acceptance criteria as a ticked checklist and `Closes #N`
- [ ] All CI checks green
- [ ] Project item status updated; **merge left to the user**
