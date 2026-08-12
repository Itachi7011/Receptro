# Security Policy

## Reporting a vulnerability

If you find a security issue in Receptro, please **do not open a public
issue**. Instead, report it privately by emailing:

`RECOMMENDED ADDITION: <add a security contact email, e.g. security@yourdomain.com>`

or via [GitHub Security Advisories](https://github.com/Itachi7011/Receptro/security/advisories/new)
for this repository.

Please include:

- A description of the issue and its potential impact
- Steps to reproduce
- Any relevant logs or code references

You should expect an initial response within a few days. This is a
single-maintainer project, so please be patient — there is no formal SLA.

## Supported versions

Receptro does not yet follow semantic versioning or maintain multiple
release branches. Security fixes are applied to `main` only.

## What's already in place

This reflects measures that exist in the codebase today, not aspirational
claims:

- Passwords are hashed with bcrypt (12 rounds).
- Sessions use JWT cookies that are `httpOnly`, `secure` in production,
  and `sameSite=lax` — not readable from client-side JS.
- OTP codes are hashed before storage, expire after a configurable
  window, and have capped verification attempts.
- Every API route validates input with Zod and scopes all queries to the
  authenticated user's `businessId` — one business's data is never
  queryable by another's session.
- Destructive/admin actions (`requireRole`) are enforced server-side, not
  just hidden in the UI.
- The cron-triggered `/api/reminders/overdue` endpoint requires a bearer
  token (`CRON_SECRET`) and returns 401/503 if it's missing or wrong.
- Login/register/OTP endpoints are rate-limited (in-memory — sufficient
  for a single instance; a multi-instance deployment should swap this for
  a shared store such as Redis).
- Errors returned to the client are generic messages; full error detail
  (including raw SQL errors) is logged server-side only.

## Known limitations

- Rate limiting is in-memory and per-instance — it does not protect
  against distributed abuse across multiple app instances.
- There is no automated dependency-vulnerability scanning configured yet
  (`RECOMMENDED ADDITION`: enable Dependabot or `npm audit` in CI).
- There is no automated security test suite; the audit trail in
  `docs/development.md` describes manual verification only.
