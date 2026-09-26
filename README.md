# Family Tree

An open-source, multi-tenant, login-gated family tree platform. Families maintain their
own trees, anyone signed in can suggest changes, verified contributors edit directly, and
intermarried families can link their trees without merging or surrendering ownership of
their data.

**Status:** pre-release. Iteration 0 (foundations) is in progress.

## Documentation

| Document                                 | Purpose                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| [FEATURES.md](FEATURES.md)               | Product scope, contribution model, privacy, standards |
| [ARCHITECTURE.md](ARCHITECTURE.md)       | Stack, data architecture, decision records            |
| [ROADMAP.md](ROADMAP.md)                 | Release iterations and definition of done             |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | Development setup and how to contribute               |
| [GOVERNANCE.md](GOVERNANCE.md)           | Maintainers, decision-making, succession              |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards                                   |
| [SECURITY.md](SECURITY.md)               | Reporting a vulnerability                             |

## Quick start

Requires Node 22.18+ and pnpm 10 (via corepack).

```bash
corepack enable pnpm
pnpm install
pnpm build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow.

## Principles

- **Users before features** — onboarding friction and engagement outrank everything else.
- **Elder-friendly** — large targets, plain language, works for non-technical users.
- **Tenant-sovereign** — each family owns, controls, and can export its own data.
- **Open by default** — Apache-2.0, open standards, no lock-in on data or identity.
- **Open to contribute, closed to strangers** — anyone signed in may suggest edits;
  nobody signed out sees anything.

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE).

All dependencies shipped in distributed artifacts must be Apache-2.0 compatible
(Apache-2.0, MIT, BSD, ISC). Copyleft licenses are not permitted in runtime dependencies.
