import type { Metadata } from "next";
import { headers } from "next/headers";
import styles from "./page.module.css";
import { getTrackingView, type TrackingStage } from "../../../lib/tracking.ts";

// Never cached, never statically generated — a tracking page is
// per-token, per-request live data; sharing a cached response across
// tokens would be a real data leak (§ Live Location Privacy — "Protect
// tracking endpoints with... appropriate caching controls").
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  // § Customer Tracking: "Do not allow search engines to index tracking
  // pages."
  return { robots: { index: false, follow: false } };
}

const STAGES: { key: TrackingStage; label: string }[] = [
  { key: "booked", label: "Booked" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pickup", label: "Pickup" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

function getClientIp(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const headerList = await headers();
  const result = await getTrackingView(token, getClientIp(headerList));

  if (result.status === "rateLimited") {
    return (
      <div className={styles.page}>
        <div className="container" style={{ paddingTop: 80 }}>
          <div className={styles.notFound}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Too many requests</h1>
            <p style={{ color: "var(--muted-on-light)" }}>
              Please wait a few minutes and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "notFound") {
    return (
      <div className={styles.page}>
        <div className="container" style={{ paddingTop: 80 }}>
          <div className={styles.notFound}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Tracking link not found</h1>
            <p style={{ color: "var(--muted-on-light)" }}>
              This tracking link is invalid or no longer active. If you believe
              this is a mistake, contact us with your booking confirmation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { view } = result;
  const activeIndex = STAGES.findIndex((s) => s.key === view.stage);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="container">
          <p className={styles.eyebrow}>Midway Mover &middot; Confidential Shipment</p>
          <h1 className={styles.statusLabel}>{view.statusLabel}</h1>
        </div>
      </div>

      <div className={styles.main}>
        <div className="container">
          <div className={styles.card}>
            {view.stage !== "exception" && (
              <div className={styles.stageTrack}>
                {STAGES.map((s, i) => (
                  <div key={s.key} className={styles.stageDot} data-done={i <= activeIndex}>
                    {i > 0 && <div className={styles.stageLine} />}
                    <div className={styles.stageCircle} />
                    <span className={styles.stageLabel}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Pickup</span>
                <span className={styles.summaryValue}>
                  {view.pickupCity && view.pickupState
                    ? `${view.pickupCity}, ${view.pickupState}`
                    : "—"}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Delivery</span>
                <span className={styles.summaryValue}>
                  {view.deliveryCity && view.deliveryState
                    ? `${view.deliveryCity}, ${view.deliveryState}`
                    : "—"}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Cargo</span>
                <span className={styles.summaryValue}>{view.cargoLabel}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Scheduled</span>
                <span className={styles.summaryValue}>
                  {view.scheduledFor
                    ? new Date(view.scheduledFor).toLocaleString()
                    : "As soon as possible"}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--muted-on-light)" }}>
              This shipment is confidential. Cargo details and pricing are not
              shown on this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
