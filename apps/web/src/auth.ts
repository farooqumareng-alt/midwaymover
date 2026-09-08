// Auth.js (NextAuth v5) configuration — the ONLY place session cookie
// shape/name is defined, so it's shared identically between the built-in
// magic-link flow below and the custom password+MFA flow in
// src/lib/staff-auth.ts + src/lib/session.ts (which creates a database
// Session row directly, bypassing Auth.js's Credentials provider — see
// staff-auth.ts for why).
//
// Session strategy is "database" (not "jwt") specifically so a session can
// be revoked server-side on demand (delete the Session row) rather than
// having to wait out a JWT's expiry — see
// docs/PHASE-0-SPECIFICATION.md § Authentication.
import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@midwaymover/db";
import { MAGIC_LINK_ROLES } from "@midwaymover/core";

/// Shared cookie definition — do not let this drift between this file and
/// src/lib/staff-auth.ts.
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-midwaymover.session-token"
    : "midwaymover.session-token";

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const {
  handlers: { GET, POST },
  auth,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Nodemailer({
      from: process.env.AUTH_EMAIL_FROM ?? "no-reply@midwaymover.com",
      // The Nodemailer provider factory requires a `server` value at
      // construction time even though our sendVerificationRequest below is
      // fully overridden and never calls the default transport — this
      // placeholder is structural only, never actually connected to. Real
      // SMTP config arrives with a chosen transactional email provider.
      server: process.env.AUTH_EMAIL_SERVER ?? "smtp://localhost:1025",
      async sendVerificationRequest({ identifier, url }) {
        // No transactional email provider is chosen yet (spec §M lists
        // candidates, not a locked choice). Fail loud in production rather
        // than pretend an email was sent; in dev, print the link so sign-in
        // is testable locally.
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "No email provider configured — cannot send a magic link in " +
              "production. Wire a real transactional email provider " +
              "before enabling customer sign-in.",
          );
        }
        // Deliberate dev-only stand-in for real email delivery — no
        // transactional email provider is chosen yet (spec §M).
        console.log(`[dev] Magic link for ${identifier}: ${url}`);
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await db.user.findUnique({
        where: { email: user.email },
        select: { role: true, disabledAt: true },
      });
      // New signup via magic link: always fine, adapter creates the user
      // with role's schema default (CUSTOMER) — see schema.prisma comment.
      if (!existing) return true;
      if (existing.disabledAt) return false;
      // An existing staff/driver account must never authenticate via
      // magic link, even though nothing in the UI offers it that way —
      // this is the server-side half of that rule (§ Zero-Assumption Rule).
      if (!MAGIC_LINK_ROLES.includes(existing.role)) return false;
      return true;
    },
    async session({ session, user }) {
      const profile = await db.user.findUnique({
        where: { id: user.id },
        select: {
          role: true,
          disabledAt: true,
          customerProfile: { select: { id: true, organizationId: true } },
          driverProfile: { select: { id: true } },
        },
      });
      if (!profile || profile.disabledAt) {
        // Fail closed: surface a session with no usable identity rather
        // than throw mid-render. Callers must treat a missing role as
        // unauthenticated (src/lib/actor.ts does this).
        return session;
      }
      return {
        ...session,
        user: {
          ...session.user,
          role: profile.role,
          organizationId: profile.customerProfile?.organizationId ?? null,
          customerProfileId: profile.customerProfile?.id ?? null,
          driverProfileId: profile.driverProfile?.id ?? null,
        },
      };
    },
  },
});
