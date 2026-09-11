import { redirect } from "next/navigation";
import { getActor } from "../../lib/actor.ts";

// Single post-login landing spot so StaffLogin doesn't need to guess a
// destination by role itself — it just redirects here, and this decides.
export const dynamic = "force-dynamic";

export default async function StaffLandingPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/staff/login");
  }
  if (actor.role === "DRIVER") {
    redirect("/driver");
  }
  if (actor.role === "DISPATCHER" || actor.role === "ADMIN") {
    redirect("/dispatch");
  }
  // BILLING/SUPER_ADMIN don't have a dedicated surface yet (later phases).
  redirect("/staff/login");
}
