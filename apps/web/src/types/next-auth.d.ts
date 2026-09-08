// Module augmentation for Auth.js's client-facing Session shape (used by
// e.g. a future useSession()/auth() UI display) — see
// docs/PHASE-0-SPECIFICATION.md §K and src/auth.ts's `session` callback.
// This is NOT the source of truth for authorization; src/lib/actor.ts is
// (see its top-of-file comment for why).
import type { UserRole } from "@midwaymover/db";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
      organizationId?: string | null;
      customerProfileId?: string | null;
      driverProfileId?: string | null;
    };
  }
}
