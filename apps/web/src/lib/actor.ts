// The authoritative source of "who is making this request, and did they
// complete MFA" for every API route's authorization decision (packages/core
// policy.ts's `Actor`). Deliberately reads the session cookie and queries
// the Session row directly rather than going through auth.ts's `session`
// callback: Auth.js's database-strategy session callback only receives
// `{ session, user }` (confirmed against @auth/core's own types) — it
// doesn't expose custom AdapterSession columns like our `mfaVerifiedAt`,
// so it can't be the source of truth for an MFA-aware authorization
// decision. auth.ts's callback still exists separately for the
// client-facing session shape (e.g. a future "signed in as X" UI); this
// function is what API routes actually call.
import { cookies } from "next/headers";
import { db } from "@midwaymover/db";
import { MFA_REQUIRED_ROLES, type Actor } from "@midwaymover/core";
import { SESSION_COOKIE_NAME } from "../auth.ts";

export async function getActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const session = await db.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: {
          customerProfile: { select: { id: true, organizationId: true } },
          driverProfile: { select: { id: true } },
        },
      },
    },
  });

  if (!session || session.expires < new Date()) return null;
  if (session.user.disabledAt) return null;

  const mfaVerified = MFA_REQUIRED_ROLES.includes(session.user.role)
    ? session.mfaVerifiedAt !== null
    : true;

  return {
    userId: session.user.id,
    role: session.user.role,
    organizationId: session.user.customerProfile?.organizationId ?? null,
    customerProfileId: session.user.customerProfile?.id ?? null,
    driverProfileId: session.user.driverProfile?.id ?? null,
    mfaVerified,
    disabled: false,
  };
}
