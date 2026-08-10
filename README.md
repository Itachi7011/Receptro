# Receptro

Distributor credit & collection manager — track dealer credit limits, invoices,
and collections without the weight of a full ERP.

Built with **Next.js 16 (App Router) + TypeScript**, **PostgreSQL** via
**Drizzle ORM**, JWT session auth with a real multi-user/role system, Zod
validation everywhere, and real API routes backed by a real database — no
mock data anywhere.

## Stack

- **Framework:** Next.js 16, App Router, TypeScript, Tailwind v4
- **Database:** PostgreSQL, via [Drizzle ORM](https://orm.drizzle.team/) + `pg`
  (chosen over Prisma because Prisma's engine binaries can't be fetched on
  every network — Drizzle is pure JS/SQL and works anywhere)
- **Auth:** email + password, OTP email verification, JWT session cookies
  (httpOnly, signed with [`jose`](https://github.com/panva/jose)), multi-user
  businesses with OWNER/ADMIN/STAFF roles
- **Validation:** Zod on every API route
- **Email:** SendGrid, with an automatic console-log fallback in dev
- **File uploads:** Cloudinary, with an automatic local-disk fallback in dev

## 1. Prerequisites

- Node.js 20+
- A PostgreSQL database — any of these work:
  - Local Postgres (`brew install postgresql` / `apt install postgresql`)
  - [Neon](https://neon.tech), [Supabase](https://supabase.com), or any
    managed Postgres — free tiers work fine

## 2. Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — your Postgres connection string
- `DATABASE_SSL=true` if your provider requires SSL (Neon, Supabase, RDS —
  usually yes; local Postgres — usually no)
- `JWT_SECRET` — generate one with `openssl rand -base64 48`
- `CRON_SECRET` — optional, only needed if you wire up the automated overdue
  reminder sweep (see below)
- Leave `SENDGRID_API_KEY` and `CLOUDINARY_*` blank for now — see below

Push the schema to your database:

```bash
npm run db:push
```

(This uses the schema in `src/db/schema.ts` directly. A versioned migration
file also ships in `/drizzle` if you'd rather run `drizzle-kit migrate` in a
real deployment pipeline.)

Start the app:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## 3. Developing without SendGrid / Cloudinary

You mentioned your SendGrid plan is currently inactive — the app is built to
keep working fully without it:

- **No `SENDGRID_API_KEY` set (or a send fails):** every email (OTP,
  welcome, team invites, payment confirmations, overdue reminders) is
  printed to the **server console** instead, in a clearly-marked block. In
  non-production mode, OTP codes are also returned directly in the API
  response (`devOtp`) and pre-filled on the verify-email page, so you can
  register and log in without ever checking the terminal.
- **No `CLOUDINARY_*` set:** file uploads (invoice attachments) are saved to
  `/public/uploads` on disk instead. Note this only works on a filesystem
  that persists between requests — fine for local dev or traditional Node
  hosting, not for read-only serverless platforms.

Once you re-subscribe to SendGrid, just fill in `SENDGRID_API_KEY` and
`SENDGRID_FROM_EMAIL` (a verified sender) and everything switches over
automatically — no code changes needed. Same for Cloudinary.

## 4. What's implemented

**Core**
- **Auth:** register → email OTP verification → login, JWT session cookies,
  rate limiting on auth endpoints, bcrypt password hashing
- **Dealers:** CRUD, credit limit with a usage bar, search, pagination,
  active/inactive status, CSV export
- **Invoices:** CRUD, optional file attachment, computed status
  (UNPAID / PARTIAL / PAID), search + status filters, pagination, CSV
  export, **bulk CSV import** (matches dealers by name, validates every row,
  reports per-row errors)
- **Payments:** record against an invoice (validated against outstanding
  balance), delete-with-reversal — both wrapped in real Postgres
  transactions with row locking, so balances can't drift under concurrent
  requests
- **Dashboard:** total outstanding, overdue, due-in-7-days, most overdue
  dealers, recent payments — all real SQL aggregations, not client-side math
- **Aging report:** 30/60/90+ day buckets per dealer, with CSV export

**Multi-user & admin**
- **Businesses are the real tenant boundary** — every dealer/invoice/payment
  belongs to a business, not a single user, so a business can have more
  than one login sharing the same data
- **Roles:** OWNER / ADMIN / STAFF. STAFF can create and edit; deleting
  dealers/invoices/payments and managing the team/settings requires ADMIN
  or OWNER. Only the OWNER can promote someone to ADMIN.
- **Team page** (`/team`): add teammates (a temp password is set directly
  and emailed — no separate invite-token flow), change role, suspend/
  reactivate, remove
- **Audit log** (`/audit-log`, ADMIN+): every create/update/delete across
  dealers, invoices, payments, team, and settings is logged with who did it
  and when
- **Settings page** (`/settings`): business name/GST/address, plus personal
  appearance preferences (theme, language)

**Reminders**
- **Manual reminder:** a "Send reminder" button on any unpaid/partial
  invoice, emails the dealer directly
- **Automated sweep:** `POST /api/reminders/overdue`, protected by
  `CRON_SECRET`, meant to be hit daily by an external scheduler. Example
  `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/reminders/overdue", "schedule": "0 9 * * *" }] }
  ```
  It respects a 3-day cooldown per invoice so dealers aren't spammed.

**Design & accessibility**
- **5 themes** (Paper, Midnight, Slate, Sepia, High contrast), switchable
  from the header, persisted per-user and to `localStorage`, with a
  flash-free load
- **4 languages** for the UI chrome — English, Hindi, Spanish, French
  (deliberately excluding Mandarin as requested). **Data fields (names,
  emails, invoice numbers, etc.) are never translated** — only interface
  labels, navigation, buttons, and messages are. Coverage: navigation,
  dashboard, dealers/invoices/payments lists and detail pages, aging
  report, team, settings, audit log, import, and the auth flow. A few
  deeper form-only screens remain English-only — the same `useLocale()` /
  dictionary pattern extends to them easily.
- **Pagination** on every list (dealers, invoices, payments, audit log)
- **Loading skeletons** instead of bare "Loading…" text
- **Mobile nav** collapses into a hamburger drawer under `md`
- **Accessibility:** skip-to-content link, visible focus rings on every
  interactive element, `aria-live` regions on all alerts/errors,
  `aria-current` on active nav links, `aria-busy`/hidden spinners on
  buttons, semantic table markup (`<caption>`, `scope="col"`), a
  `prefers-reduced-motion` override, and a genuine high-contrast theme
  option

## 5. Project structure

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
```

## 6. Security notes

- Passwords hashed with bcrypt (12 rounds)
- JWT session tokens, httpOnly + `secure` (in production) + `sameSite=lax`
  cookies — not accessible to client-side JS
- OTP codes hashed before storage, expire after 10 minutes, capped attempts
- Every API route validates input with Zod and scopes queries to the
  authenticated user's **business** — one business's data is never visible
  to another's, and role checks (`requireRole`) gate destructive/admin
  actions server-side, not just hidden in the UI
- The `/api/reminders/overdue` cron endpoint is bearer-token protected and
  returns 401/503 if `CRON_SECRET` is missing or wrong
- Rate limiting on register/login/OTP endpoints (in-memory — fine for a
  single instance; swap for Redis if you deploy multi-instance)
- Generic error messages returned to the client; full errors (including
  raw SQL errors) logged server-side only, never leaked to the browser

## 7. Useful scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm run db:generate   # generate a new migration from schema changes
npm run db:push       # push schema directly to the DB (fast iteration)
npm run db:studio     # open Drizzle Studio (visual DB browser)
```

## 8. Verified end-to-end

Every feature above was exercised against a live PostgreSQL instance during
development, not just build-checked: registration → OTP verification →
login, adding a STAFF teammate and confirming their login *and* that
destructive/admin actions correctly return 403 for them, dealer/invoice/
payment CRUD with transactional balance updates, CSV export for all three
report types, bulk CSV import with mixed valid/invalid/duplicate rows,
manual and cron-protected reminder emails, business settings updates,
personal theme/locale preference syncing, and the audit log capturing every
one of the above actions correctly.
