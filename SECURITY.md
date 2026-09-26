# Security Policy

This project stores family data — names, dates, photographs, and relationships for living
people. A vulnerability here is a privacy incident for real families, so we treat security
reports seriously and gratefully.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through
[GitHub Security Advisories](https://github.com/alexjose/family-tree/security/advisories/new).
If that is unavailable, contact a maintainer listed in [GOVERNANCE.md](GOVERNANCE.md).

Please include:

- What the issue is and why it matters
- Steps to reproduce, or a proof of concept
- Affected version or commit
- Any suggested fix

Use synthetic data in your report. Never include another person's real data as evidence.

## What to expect

| Stage                  | Target                                  |
| ---------------------- | --------------------------------------- |
| Acknowledgement        | 3 working days                          |
| Initial assessment     | 10 working days                         |
| Fix or mitigation plan | 30 days for high severity               |
| Public disclosure      | After a fix ships, coordinated with you |

We follow coordinated disclosure. We will credit you in the advisory unless you prefer
to remain anonymous.

## Scope

In scope:

- Tenant isolation failures — any path where one family can read or modify another's data
- Authentication and session handling
- Authorization bypass, including cross-tenant sharing scopes
- Exposure of data to unauthenticated visitors (the product is entirely login-gated)
- Injection, XSS in user-generated content, CSRF
- Media access control and signed URL handling
- Privilege escalation through the approval or verified-contributor system
- Secrets exposure in logs, telemetry, or notifications

Out of scope:

- Findings against a self-hosted instance you do not control
- Denial of service through volumetric attacks
- Missing hardening headers with no demonstrable impact
- Social engineering of maintainers or users
- Automated scanner output without a working proof of concept

## Self-hosters

Security fixes are released as patch versions and announced in the repository advisories.
Watch releases to be notified. Self-hosted deployments are responsible for their own
infrastructure, secrets, backups, and upgrade cadence.

## Safe harbour

We will not pursue legal action against good-faith research that respects user privacy,
avoids data destruction and service degradation, uses only accounts and data you own, and
reports findings promptly and privately.
