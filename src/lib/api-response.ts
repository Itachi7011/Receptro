import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/requireUser";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

/**
 * Postgres error codes we handle specially. node-postgres attaches `code`
 * directly to the error it throws, but Drizzle wraps that in a
 * DrizzleQueryError and moves the original pg error to `.cause` — so we
 * check both spots.
 */
function pgErrorCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const direct = (err as unknown as { code?: string }).code;
  if (direct) return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error) return (cause as unknown as { code?: string }).code;
  return undefined;
}

/** Central error handler for API route try/catch blocks. */
export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return fail(err.message, err.status);
  }
  if (err instanceof ZodError) {
    return fail("Validation failed", 422, err.flatten().fieldErrors);
  }

  const code = pgErrorCode(err);
  if (code === "23505") {
    return fail("A record with this value already exists.", 409);
  }
  if (code === "23503") {
    return fail("This record is referenced elsewhere and can't be modified.", 409);
  }

  // Never leak internal error details (SQL text, stack traces, etc.) to the
  // client — log server-side for debugging, return a generic message.
  console.error(err);
  return fail("Something went wrong. Please try again.", 500);
}
