# Architecture

## Overview

Receptro is a single Next.js 16 (App Router) application — one deployable
unit that serves both the UI and the API. There is no separate backend
service.

```
Browser
  │
  ▼
Next.js App Router (src/app)
  ├─ Pages: (app)/ authenticated shell, login/register/verify-otp
  ├─ src/proxy.ts — route protection (redirects unauthenticated users
  │                  away from protected pages, and authenticated users
  │                  away from auth pages)
  └─ API routes (src/app/api/**/route.ts) — the real backend
        │
        ▼
   src/lib/auth — session/JWT/OTP/password helpers, requireUser/requireRole
   src/lib/validations — Zod schema per resource
        │
        ▼
   src/db (Drizzle ORM) ──▶ PostgreSQL
        │
        ▼
   External services (optional, with dev fallbacks):
     - SendGrid (email) → falls back to console logging
     - Cloudinary (file storage) → falls back to /public/uploads on disk
```

## Tenancy model

`businesses` is the tenant boundary. Every `dealer`, `invoice`, `payment`,
and `audit_log` row belongs to a `business_id`, not directly to a user.
This is what allows a business to have multiple logins (OWNER/ADMIN/STAFF)
sharing the same data. Every API route filters on
`eq(table.businessId, user.businessId)` — see `src/lib/auth/requireUser.ts`
and the query patterns in `src/app/api/**/route.ts`.

## Data model

Defined in `src/db/schema.ts` (Drizzle ORM, PostgreSQL):

- `businesses` — tenant root (name, GST number, address)
- `users` — belongs to a business; role (`OWNER`/`ADMIN`/`STAFF`), status,
  OTP verification fields, theme/locale preferences
- `dealers` — customers being tracked, with a credit limit
- `invoices` — belong to a dealer; status is computed
  (`UNPAID`/`PARTIAL`/`PAID`) from payments against the invoice total
- `payments` — recorded against an invoice, wrapped in a database
  transaction with row locking so concurrent payment writes can't corrupt
  an invoice's balance
- `audit_logs` — append-only log of create/update/delete actions across
  dealers, invoices, payments, team, and settings

Migrations are managed with `drizzle-kit` (`drizzle/` holds generated SQL;
`npm run db:generate` / `db:push` in `package.json`).

## Auth flow

1. `POST /api/auth/register` creates a business + OWNER user, sends an OTP.
2. `POST /api/auth/verify-otp` verifies the OTP and issues a JWT session
   cookie (`jose`, httpOnly, `secure` in production, `sameSite=lax`).
3. `src/proxy.ts` reads the session cookie on every request and redirects
   based on route + auth state (`PROTECTED_PREFIXES` / `AUTH_PAGES`).
4. Every API route calls `requireUser()` (and `requireRole()` for
   admin-only actions) from `src/lib/auth/requireUser.ts` to re-verify the
   session server-side — the proxy redirect is a UX convenience, not the
   security boundary.

## Request flow example: recording a payment

1. `PaymentForm.tsx` submits to `POST /api/payments`.
2. `requireUser()` resolves the session and business.
3. `paymentSchema` (Zod) validates the body.
4. A Postgres transaction locks the invoice row, validates the payment
   against the outstanding balance, inserts the payment, and recomputes
   invoice status — all inside `src/app/api/payments/route.ts`.
5. `logAudit()` (`src/lib/audit.ts`) writes an audit log entry.
6. The dashboard's aggregate queries (`src/app/api/dashboard/summary`)
   reflect the change on next load — these are real SQL aggregations, not
   client-side math.

## Deployment shapes

Two deployment paths exist in the repo, described in full in
`DEPLOYMENT.md`:

- **Docker Compose** (`compose.yaml`) — app + Postgres, for local/single-
  server use. `Dockerfile` is a 3-stage build producing a Next.js
  `output: standalone` image.
- **Kubernetes** (`k8s/*.yaml`) — namespace, Postgres deployment/PVC,
  app deployment/service/ingress, and a migration Job, for testing the app
  in a cluster.

## Internationalization & theming

`src/lib/i18n/dictionaries/{en,hi,es,fr}.ts` hold UI-chrome translations
(`LocaleContext`); data fields (dealer names, invoice numbers, etc.) are
never translated. `ThemeContext` persists a per-user theme preference (5
themes) both server-side (`users.theme`) and to `localStorage` for a
flash-free load.
