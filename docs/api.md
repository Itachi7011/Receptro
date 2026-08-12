# API reference

All routes live under `src/app/api/` (Next.js Route Handlers). There is no
separate API service — this runs in the same Next.js process as the UI.

## Conventions

- **Auth**: session is an httpOnly JWT cookie. Server-side, every route
  calls `requireUser(req)` (any active, verified user in the business) or
  `requireRole(req, "ADMIN")` (ADMIN or OWNER only) from
  `src/lib/auth/requireUser.ts`. Role ranks: `STAFF < ADMIN < OWNER`.
- **Tenancy**: every query is scoped to the caller's `businessId` —
  cross-business access is not possible even with a valid session for a
  different business.
- **Validation**: request bodies are parsed with a Zod schema from
  `src/lib/validations/`; failures return `422` with per-field errors.
- **Response shape** (`src/lib/api-response.ts`):
  - Success: `{ "success": true, "data": ... }`
  - Failure: `{ "success": false, "error": "...", "details": ... }`
- **Error handling**: `handleApiError()` maps `AuthError` → 401/403,
  `ZodError` → 422, Postgres unique/foreign-key violations → 409, and
  everything else → a generic 500 (full error is logged server-side only,
  never returned to the client).
- **Pagination**: list endpoints accept `page` and `limit` (max 100) query
  params and return `{ ..., pagination: { page, limit, total, pages } }`.

## Endpoints

### Auth (`/api/auth`)

| Method & path | Description |
|---|---|
| `POST /api/auth/register` | Create a business + OWNER user, send OTP |
| `POST /api/auth/verify-otp` | Verify OTP, issue JWT session cookie |
| `POST /api/auth/resend-otp` | Resend a new OTP |
| `POST /api/auth/login` | Email + password login |
| `POST /api/auth/logout` | Clear the session cookie |
| `GET /api/auth/me` | Current authenticated user |
| `PATCH /api/auth/preferences` | Update personal theme/locale preference |

### Dealers (`/api/dealers`)

| Method & path | Description |
|---|---|
| `GET /api/dealers` | List, with `search`, `status`, `page`, `limit` |
| `POST /api/dealers` | Create a dealer |
| `GET/PATCH/DELETE /api/dealers/[id]` | Read/update/delete a dealer |
| `GET /api/dealers/export` | CSV export |

### Invoices (`/api/invoices`)

| Method & path | Description |
|---|---|
| `GET /api/invoices` | List, with `dealer`, `status`, `search`, `overdue`, `page`, `limit` |
| `POST /api/invoices` | Create an invoice (optional file attachment) |
| `GET/PATCH/DELETE /api/invoices/[id]` | Read/update/delete an invoice |
| `POST /api/invoices/[id]/remind` | Send a manual reminder email to the dealer |
| `GET /api/invoices/export` | CSV export |
| `POST /api/invoices/import` | Bulk CSV import — matches dealers by name, validates every row, returns per-row errors |

### Payments (`/api/payments`)

| Method & path | Description |
|---|---|
| `GET /api/payments` | List |
| `POST /api/payments` | Record a payment against an invoice (transactional, row-locked, validated against outstanding balance) |
| `DELETE /api/payments/[id]` | Delete with balance reversal |

### Reports (`/api/reports`, `/api/dashboard`)

| Method & path | Description |
|---|---|
| `GET /api/dashboard/summary` | Total outstanding, overdue, due-in-7-days, most-overdue dealers, recent payments (SQL aggregations) |
| `GET /api/reports/aging` | 30/60/90+ day aging buckets per dealer |
| `GET /api/reports/aging/export` | CSV export of the aging report |

### Team & admin (`/api/team`, `/api/audit-logs`, `/api/settings`)

| Method & path | Description |
|---|---|
| `GET /api/team` | List teammates (ADMIN+) |
| `POST /api/team` | Add a teammate — sets and emails a temp password (ADMIN+) |
| `PATCH/DELETE /api/team/[id]` | Change role / suspend / remove (ADMIN+; only OWNER can promote to ADMIN) |
| `GET /api/audit-logs` | Paginated audit log (ADMIN+) |
| `GET/PATCH /api/settings` | Business + personal settings |

### Reminders & uploads

| Method & path | Description |
|---|---|
| `POST /api/reminders/overdue` | Automated overdue sweep. Bearer-token protected via `CRON_SECRET`; returns 401/503 if missing/wrong. Meant to be hit daily by an external scheduler (example `vercel.json` cron in the README). Respects a 3-day cooldown per invoice. |
| `POST /api/upload` | File upload — Cloudinary if configured, `/public/uploads` fallback in dev |

## Example

```bash
curl -X POST http://localhost:3000/api/dealers \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<jwt>" \
  -d '{"name": "Acme Distributors", "creditLimit": 50000}'
```

```json
{
  "success": true,
  "data": {
    "id": "…",
    "name": "Acme Distributors",
    "creditLimit": 50000,
    "status": "ACTIVE",
    "createdAt": "…"
  }
}
```

`RECOMMENDED ADDITION`: this document is written from the route handlers
directly. An OpenAPI/Swagger spec generated from the Zod schemas (e.g.
via `zod-to-openapi`) would let this stay in sync automatically and add
an interactive explorer — not currently set up.
