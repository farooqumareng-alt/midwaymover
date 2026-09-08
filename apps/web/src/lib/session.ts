// Creates a real database Session row + matching cookie, using the exact
// same cookie name/shape Auth.js's own database-strategy flow uses (see
// auth.ts) — so auth() correctly recognizes sessions created here, even
// though they never went through NextAuth's own sign-in machinery. Used by
// the password+MFA staff-login route, never by the magic-link flow (Auth.js
// handles that one itself via the Prisma adapter).
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@midwaymover/db";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../auth.ts";

export async function createServerSession(
  userId: string,
  { mfaVerified }: { mfaVerified: boolean },
): Promise<void> {
  const sessionToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
      mfaVerifiedAt: mfaVerified ? new Date() : null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires,
  });
}
