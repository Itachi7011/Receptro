<div align="center">

# Receptro

**Distributor credit & collection manager** — track dealer credit limits,
invoices, and collections without the weight of a full ERP.

[![CI](https://github.com/Itachi7011/Receptro/actions/workflows/ci.yml/badge.svg)](https://github.com/Itachi7011/Receptro/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle%20ORM-336791)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#features) • [Tech stack](#tech-stack) • [Getting started](#getting-started) • [Docker](#docker) • [API docs](docs/api.md) • [Roadmap](#roadmap)

</div>

<!--
RECOMMENDED ADDITION: a hosted demo link and 2–3 screenshots/GIF here.
See "Visual presentation" guidance provided separately for exactly what
to capture. Once captured, replace this comment with:

  ### Demo
  🔗 [Live demo](your-deploy-url) (optional — only if you deploy one)

  ![Dashboard](docs/screenshots/dashboard.png)
-->

## Why this project exists

Small distributors tracking dealer credit and collections in spreadsheets
run into the same problems: no single view of who owes what, no audit
trail of who changed a number, and no automated nudge when an invoice
goes overdue. Full ERP systems solve this but are heavy to set up and
operate for a business that just needs credit tracking and collections.

Receptro is a focused, self-hostable tool for that specific problem:
dealers, invoices, payments, and an aging report — with real multi-user
roles and an audit log, nothing else.

## Features

**Core**
- Auth: register → email OTP verification → login, JWT session cookies,
  rate limiting on auth endpoints, bcrypt password hashing
- Dealers: CRUD, credit limit with a usage bar, search, pagination,
  active/inactive status, CSV export
- Invoices: CRUD, optional file attachment, computed status
  (UNPAID / PARTIAL / PAID), search + status filters, pagination, CSV
  export, bulk CSV import (matches dealers by name, validates every row,
  reports per-row errors)
- Payments: record against an invoice (validated against outstanding
  balance), delete-with-reversal — both wrapped in Postgres transactions
  with row locking, so balances can't drift under concurrent requests
- Dashboard: total outstanding, overdue, due-in-7-days, most overdue
  dealers, recent payments — real SQL aggregations, not client-side math
- Aging report: 30/60/90+ day buckets per dealer, with CSV export

**Multi-user & admin**
- Businesses are the real tenant boundary — every dealer/invoice/payment
  belongs to a business, not a single user, so a business can have more
  than one login sharing the same data
- Roles: OWNER / ADMIN / STAFF. STAFF can create and edit; deleting
  records and managing the team/settings requires ADMIN or OWNER. Only
  the OWNER can promote someone to ADMIN
- Team page (`/team`): add teammates (temp password set and emailed),
  change role, suspend/reactivate, remove
- Audit log (`/audit-log`, ADMIN+): every create/update/delete across
  dealers, invoices, payments, team, and settings, with who and when
- Settings page (`/settings`): business name/GST/address, plus personal
  appearance preferences (theme, language)

**Reminders**
- Manual "Send reminder" button on any unpaid/partial invoice
- Automated overdue sweep (`POST /api/reminders/overdue`), bearer-token
  protected, meant to be hit daily by an external scheduler; 3-day
  cooldown per invoice

**Design & accessibility**
- 5 themes (Paper, Midnight, Slate, Sepia, High contrast), persisted
  per-user, flash-free load
- 4 UI languages — English, Hindi, Spanish, French. Data fields (names,
  emails, invoice numbers) are never translated, only interface chrome
- Pagination on every list, loading skeletons, mobile hamburger nav
- Accessibility: skip-to-content link, visible focus rings, `aria-live`
  regions, `aria-current` nav state, semantic table markup,
  `prefers-reduced-motion` support, a genuine high-contrast theme

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), TypeScript, Tailwind v4 | |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/) + `pg` | Chosen over Prisma because Prisma's engine binaries can't be fetched on every network — Drizzle is pure JS/SQL and works anywhere |
| Auth | Email + password, OTP verification, JWT session cookies via [`jose`](https://github.com/panva/jose) | httpOnly, signed, multi-user businesses with OWNER/ADMIN/STAFF roles |
| Validation | Zod on every API route | |
| Email | SendGrid, automatic console-log fallback in dev | |
| File uploads | Cloudinary, automatic local-disk fallback in dev | |

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full breakdown
of the tenancy model, data model, auth flow, and a request-flow example.

```
Browser → Next.js App Router (pages + API routes) → Postgres (Drizzle ORM)
                    │                    │
              src/proxy.ts         SendGrid / Cloudinary
           (route protection)      (optional, with dev fallbacks)
```

## Project structure

```
src/
  app/
    (app)/              # authenticated app shell: dashboard, dealers, invoices,
                         # payments, reports, team, settings, audit-log
    api/                 # route handlers — the real backend
    login, register, verify-otp/   # auth pages
  components/
    ui/                   # Button, Field, Card, Pagination, Skeleton, ...
    dealers/, payments/, settings/
  context/                # AuthContext, ThemeContext, LocaleContext
  db/
    schema.ts             # Drizzle schema — businesses, users, dealers,
                           # invoices, payments, audit_logs
    index.ts               # pooled connection
  lib/
    auth/                  # password, OTP, JWT, session, role-check helpers
    email/                  # SendGrid + console-fallback sender, templates
    i18n/                    # dictionaries (en/hi/es/fr) + locale registry
    validations/              # Zod schemas per resource
    audit.ts                   # audit log writer
    csv.ts                      # CSV export helper
    cloudinary.ts
    invoice-utils.ts             # status + aging bucket logic
  proxy.ts                # route protection (Next.js 16's middleware convention)
drizzle/                  # generated SQL migrations
k8s/                       # Kubernetes manifests (see DEPLOYMENT.md)
```

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database — local, or a free-tier managed instance
  ([Neon](https://neon.tech), [Supabase](https://supabase.com), etc.)

### Setup

```bash
git clone https://github.com/Itachi7011/Receptro.git
cd Receptro
npm install
cp .env.example .env
```

Edit `.env` (full variable reference: [`.env.example`](.env)):

- `DATABASE_URL` — your Postgres connection string
- `DATABASE_SSL=true` if your provider requires SSL (Neon, Supabase, RDS —
  usually yes; local Postgres — usually no)
- `JWT_SECRET` — generate one with `openssl rand -base64 48`
- `CRON_SECRET` — optional, only needed if you wire up the automated
  overdue reminder sweep
- Leave `SENDGRID_API_KEY` and `CLOUDINARY_*` blank to start — see below

```bash
npm run db:push   # push src/db/schema.ts to your database
npm run dev       # http://localhost:3000
```

### Developing without SendGrid / Cloudinary

The app is built to keep working fully without either configured:

- **No `SENDGRID_API_KEY`:** every email (OTP, welcome, team invites,
  payment confirmations, overdue reminders) is printed to the server
  console instead, in a clearly-marked block. In non-production mode, OTP
  codes are also returned directly in the API response (`devOtp`) and
  pre-filled on the verify-email page, so you can register and log in
  without checking the terminal.
- **No `CLOUDINARY_*`:** file uploads (invoice attachments) are saved to
  `/public/uploads` on disk instead. This only works on a filesystem that
  persists between requests — fine for local dev or traditional Node
  hosting, not for read-only serverless platforms.

Once configured, both switch over automatically — no code changes needed.

## Environment variables

Full reference in [`.env.example`](.env). Only `DATABASE_URL` and
`JWT_SECRET` are required to run the app; everything else is optional and
falls back gracefully (see above).

## Docker

```bash
docker compose build
docker compose up -d db
docker compose run --rm migrate   # one-time schema setup
docker compose up -d
```

Full walkthrough, including a **Kubernetes** deployment path (namespace,
Postgres deployment/PVC, app deployment/service/ingress, migration Job),
is in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Useful scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm run db:generate   # generate a new migration from schema changes
npm run db:push       # push schema directly to the DB (fast iteration)
npm run db:studio     # open Drizzle Studio (visual DB browser)
```

## API documentation

Full endpoint reference: [`docs/api.md`](docs/api.md).

## Testing

There is no automated test suite in this repository yet. Every feature
listed above was exercised manually against a live PostgreSQL instance
during development — see [`docs/development.md`](docs/development.md)
for exactly what was verified. Adding an automated suite (Vitest for
`src/lib/` helpers, Playwright for the auth/dealer/invoice flows) is
tracked in the [Roadmap](#roadmap).

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for Docker Compose and Kubernetes.
The app also runs on any Node hosting platform (e.g. Vercel) — set the
environment variables from `.env.example` and point `DATABASE_URL` at a
managed Postgres instance.

## Security

Passwords hashed with bcrypt; httpOnly/secure/sameSite session cookies;
OTP hashing and expiry; every API route scoped to the caller's business
and role; bearer-token-protected cron endpoint; rate limiting on auth
routes; generic client-facing errors with server-side logging. Full
details and known limitations: [`SECURITY.md`](SECURITY.md).

## Performance & scaling considerations

- Dashboard and aging-report figures are computed with SQL aggregations
  rather than pulled client-side, so they scale with the database, not
  the browser.
- Rate limiting is in-memory, which is correct for a single instance but
  will not coordinate across multiple instances — see `SECURITY.md`.
- The `/public/uploads` local-disk fallback for file uploads only works
  on a persistent filesystem; use Cloudinary for serverless deployments.

## Roadmap

**Shipped:** everything under [Features](#features) above.

**Planned:** automated tests, OpenAPI-generated API docs, hosted demo.
See the full breakdown in the project's GitHub issues/milestones.

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for
local setup, coding conventions, and the PR checklist.

## License

[MIT](LICENSE)
