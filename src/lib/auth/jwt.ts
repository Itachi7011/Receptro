import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

export interface SessionTokenPayload extends JWTPayload {
  sub: string; // user id
  email: string;
  role: string;
}

function getSecretKey(): Uint8Array {
  if (!env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not set. Add a long, random JWT_SECRET to your .env file (see .env.example).",
    );
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
}): Promise<string> {
  const secret = getSecretKey();
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_EXPIRES_IN_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}
