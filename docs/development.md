# Development guide

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local, or a free-tier hosted instance — Neon,
  Supabase, etc.)

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` — at minimum `DATABASE_URL` and `JWT_SECRET`. See the
README's "Developing without SendGrid / Cloudinary" section for how the
app behaves with those left blank (it works fully in dev without them).

```bash
npm run db:push   # push src/db/schema.ts to your database
npm run dev       # http://localhost:3000
```

## Available scripts

These are the scripts that actually exist in `package.json`:

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint (`eslint-config-next`, core-web-vitals + TypeScript) |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:push` | Push the schema directly to the DB (fast local iteration) |
| `npm run db:studio` | Open Drizzle Studio, a visual DB browser |

There is currently no `npm test` / `npm run typecheck` script.
`RECOMMENDED ADDITION`: add `"typecheck": "tsc --noEmit"` to
`package.json` (the config already supports it — `tsconfig.json` has
`"noEmit": true`).

## Project structure

```
src/
  app/
    (app)/        # authenticated shell: dashboard, dealers, invoices,
                   # payments, reports, team, settings, audit-log
    api/           # route handlers — the real backend
    login, register, verify-otp/
  components/
    ui/             # Button, Field, Card, Pagination, Skeleton, ...
    dealers/, payments/, settings/
  context/          # AuthContext, ThemeContext, LocaleContext
  db/
    schema.ts       # Drizzle schema
    index.ts        # pooled connection
  lib/
    auth/           # password, OTP, JWT, session, role-check helpers
    email/          # SendGrid + console-fallback sender, templates
    i18n/           # dictionaries (en/hi/es/fr) + locale registry
    validations/    # Zod schemas per resource
    audit.ts, csv.ts, cloudinary.ts, invoice-utils.ts
  proxy.ts          # route protection (Next.js 16 middleware convention)
drizzle/            # generated SQL migrations
k8s/                 # Kubernetes manifests (see DEPLOYMENT.md)
```

## Database changes

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` to create a migration file in `drizzle/`.
3. `npm run db:push` (or `drizzle-kit migrate` in a real pipeline) to
   apply it.
4. Commit the generated migration alongside your schema change.

## Testing status

There is no automated test suite in this repository yet.
`RECOMMENDED ADDITION`: unit tests for `src/lib/invoice-utils.ts` (status
and aging-bucket logic) and `src/lib/validations/*` (Zod schemas) with
Vitest would be the highest-value starting point, since they're pure
functions with no DB dependency.

What has been manually verified end-to-end against a live PostgreSQL
instance during development (per the README): registration → OTP
verification → login; adding a STAFF teammate and confirming role-gated
403s; dealer/invoice/payment CRUD including transactional balance
updates; CSV export/import; manual and cron-protected reminder emails;
settings updates; theme/locale preference syncing; and audit log entries
for the above.

## Docker

See `DEPLOYMENT.md` for the full Docker Compose and Kubernetes walkthrough.
Quick path:

```bash
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d
```
