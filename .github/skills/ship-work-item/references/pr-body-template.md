# Pull Request Body Template

Copy, fill, and pass to `gh pr create --body-file`. Delete sections that genuinely do not apply.

```markdown
## Work item

[I0] <work item title> — https://github.com/users/alexjose/projects/6

## What changed

<2–5 plain-language sentences. What a reviewer needs to know, not a file-by-file list.>

## Acceptance criteria

<Copy verbatim from the work item. Tick only what is demonstrably true, with evidence.>

- [x] <criterion> — <evidence: command output, test name, or screenshot>
- [x] <criterion> — <evidence>
- [ ] <criterion> — deferred, see follow-up below

## Quality gates

| Gate                | Result   |
| ------------------- | -------- |
| `pnpm format:check` | ✅       |
| `pnpm lint`         | ✅       |
| `pnpm typecheck`    | ✅       |
| `pnpm build`        | ✅       |
| `pnpm test`         | ✅       |
| axe / Lighthouse    | ✅ / n/a |

## Out of scope / follow-ups

<Anything found but not fixed here, and the item it should become. Write "None" if none.>

## Notes for the reviewer

<Decisions worth a second opinion, trade-offs taken, or areas needing careful review.>
```

## Rules

- Never tick a box that is not actually satisfied. An unticked box with a reason is fine;
  a false tick is not.
- Screenshots are required for any user-facing change — mobile (360px) and desktop.
- If the PR touches the database schema, state explicitly whether RLS policies and pgTAP
  isolation tests were added.
- Keep the title identical to the first commit subject.
