"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./CustodyLogView.module.css";
import type { CustodyLog } from "../../lib/dispatch.ts";

interface Props {
  log: CustodyLog;
}

function formatTimestamp(value: Date | string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CorrectionForm({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!note.trim()) {
      setError("A note is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/dispatch/shipments/${shipmentId}/custody-correction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add correction.");
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div className={styles.correctionForm}>
      <textarea
        className={styles.textarea}
        placeholder="Add a correction or addendum to this record (e.g. a mistyped seal number, a clarification) — this appends a new event, it never edits or removes an earlier one."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />
      {error && <span className="errorText">{error}</span>}
      <button type="button" className="btnPrimary" onClick={submit} disabled={busy}>
        {busy ? "Adding…" : "Add correction"}
      </button>
    </div>
  );
}

export function CustodyLogView({ log }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="container">
          <Link href="/dispatch" className={styles.backLink}>
            ← Dispatch
          </Link>
          <h1 className={styles.title}>Chain of custody</h1>
          <div className={styles.subtitle}>
            Shipment {log.shipmentId} — status: {log.status}
          </div>
        </div>
      </div>
      <div className="container">
        <div className={styles.main}>
          {log.incidents.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Incidents</h2>
              <div className={styles.list}>
                {log.incidents.map((i) => (
                  <div key={i.id} className={styles.card}>
                    <div className={styles.cardRow}>
                      <span
                        className={`${styles.badge} ${i.status === "OPEN" ? styles.badgeWarn : ""}`}
                      >
                        {i.status}
                      </span>
                      <span className={styles.timestamp}>{formatTimestamp(i.createdAt)}</span>
                    </div>
                    <p className={styles.description}>{i.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {log.seals.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Seals</h2>
              <div className={styles.list}>
                {log.seals.map((s, idx) => (
                  <div key={idx} className={styles.card}>
                    <div className={styles.cardRow}>
                      <span className={styles.cardValue}>{s.sealNumber}</span>
                      <span
                        className={`${styles.badge} ${
                          s.status === "VERIFIED_MISMATCH" ? styles.badgeWarn : ""
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Applied</span>
                      <span className={styles.timestamp}>{formatTimestamp(s.appliedAt)}</span>
                    </div>
                    {s.verifiedAt && (
                      <div className={styles.cardRow}>
                        <span className={styles.cardLabel}>Verified</span>
                        <span className={styles.timestamp}>{formatTimestamp(s.verifiedAt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className={styles.sectionTitle}>Custody events</h2>
            <div className={styles.timeline}>
              {log.custodyEvents.length === 0 && (
                <p className={styles.empty}>No custody events yet.</p>
              )}
              {log.custodyEvents.map((e) => (
                <div key={e.id} className={styles.timelineRow}>
                  <span className={styles.timestamp}>{formatTimestamp(e.createdAt)}</span>
                  <span className={styles.eventType}>{e.eventType}</span>
                  <span className={styles.actor}>{e.actorEmail ?? "system"}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Status history</h2>
            <div className={styles.timeline}>
              {log.statusHistory.map((e) => (
                <div key={e.id} className={styles.timelineRow}>
                  <span className={styles.timestamp}>{formatTimestamp(e.createdAt)}</span>
                  <span className={styles.eventType}>
                    {e.fromStatus ? `${e.fromStatus} → ${e.toStatus}` : e.toStatus}
                  </span>
                  <span className={styles.actor}>{e.actorEmail ?? "system"}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Add a correction</h2>
            <CorrectionForm shipmentId={log.shipmentId} />
          </section>
        </div>
      </div>
    </div>
  );
}
