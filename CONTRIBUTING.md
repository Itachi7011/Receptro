# Contributing to Receptro

Thanks for considering a contribution. This is a small project, so the
process is intentionally lightweight.

## Getting set up

1. Fork and clone the repo.
2. `npm install`
3. `cp .env.example .env` and fill in `DATABASE_URL` and `JWT_SECRET` at
   minimum (see README for a full walkthrough, including how to develop
   without SendGrid/Cloudinary).
4. `npm run db:push` to create the schema on your database.
5. `npm run dev` and open `http://localhost:3000`.

## Before opening a PR

Run these locally — they are the same checks CI runs:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

There is no automated test suite yet (see `docs/development.md` for
current manual-testing coverage). If your change touches auth, payments,
or invoice status logic, please describe how you manually verified it in
the PR description.

## Making changes

- Keep the tenant boundary intact: every dealer/invoice/payment query
  must be scoped to `businessId`. This is the core security invariant of
  the app — see `SECURITY.md`.
- New API routes should follow the existing pattern: `requireUser()` /
  `requireRole()` for auth, a Zod schema in `src/lib/validations/` for
  input, `ok()` / `handleApiError()` from `src/lib/api-response.ts` for
  responses.
- If you add a new user-facing string, add it to all four dictionaries in
  `src/lib/i18n/dictionaries/` (`en`, `hi`, `es`, `fr`) or explicitly
  leave it English-only and say so in the PR — don't leave dictionaries
  out of sync silently.
- Run `npm run db:generate` after changing `src/db/schema.ts` so a
  migration file is committed alongside the schema change.

## Commit / PR style

- Keep PRs focused on one change.
- Use a clear title and reference the related issue (`Closes #12`) if
  one exists.
- Screenshots are appreciated for any UI change.

## Reporting bugs / requesting features

Use the issue templates under `.github/ISSUE_TEMPLATE/`.

## Code of conduct

By participating, you agree to abide by `CODE_OF_CONDUCT.md`.
