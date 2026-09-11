"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DriverJobWorkflow.module.css";
import type { DriverJobDetail } from "../../lib/driver.ts";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function ActionButton({
  label,
  url,
  className = "btnPrimary",
}: {
  label: string;
  url: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson(url);
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Could not complete action.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && <span className="errorText">{error}</span>}
      <button
        type="button"
        className={`${className} ${styles.bigButton}`}
        onClick={run}
        disabled={busy}
      >
        {busy ? "Working…" : label}
      </button>
    </div>
  );
}

function CodeVerificationForm({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson(url, { code });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Incorrect code.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label className="label">{label}</label>
      <input
        className={`input ${styles.pinInput}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        maxLength={6}
      />
      {error && <span className="errorText">{error}</span>}
      <button
        type="button"
        className={`btnPrimary ${styles.bigButton}`}
        onClick={submit}
        disabled={busy || code.length !== 6}
      >
        {busy ? "Verifying…" : "Verify"}
      </button>
    </div>
  );
}

function CargoConfirmation({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function matches() {
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson(`/api/driver/jobs/${shipmentId}/cargo-matches`);
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Could not confirm.");
      return;
    }
    router.refresh();
  }

  async function submitIssue() {
    if (!description.trim()) {
      setError("Describe the issue.");
      return;
    }
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson(`/api/driver/jobs/${shipmentId}/report-issue`, {
      description,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Could not report issue.");
      return;
    }
    router.refresh();
  }

  if (reporting) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="label">What&rsquo;s wrong?</label>
        <textarea
          className="input"
          style={{ minHeight: 88, resize: "vertical" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <span className="errorText">{error}</span>}
        <button
          type="button"
          className={`btnPrimary ${styles.bigButton}`}
          onClick={submitIssue}
          disabled={busy}
        >
          {busy ? "Submitting…" : "Submit Issue"}
        </button>
        <button type="button" className="btnGhostLight" onClick={() => setReporting(false)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && <span className="errorText">{error}</span>}
      <div className={styles.matchButtons}>
        <button type="button" className="btnPrimary" onClick={matches} disabled={busy}>
          {busy ? "Working…" : "Cargo Matches"}
        </button>
        <button
          type="button"
          className={`${styles.destructiveButton}`}
          onClick={() => setReporting(true)}
        >
          Report Issue
        </button>
      </div>
    </div>
  );
}

function StageContent({ job }: { job: DriverJobDetail }) {
  switch (job.status) {
    case "ASSIGNED":
      return (
        <ActionButton label="Accept Job" url={`/api/driver/jobs/${job.shipmentId}/accept`} />
      );
    case "DRIVER_EN_ROUTE_PICKUP":
      return (
        <ActionButton
          label="Arrived at Pickup"
          url={`/api/driver/jobs/${job.shipmentId}/arrived-pickup`}
        />
      );
    case "ARRIVED_PICKUP":
      return (
        <CodeVerificationForm
          url={`/api/driver/jobs/${job.shipmentId}/verify-pickup`}
          label="Enter the pickup code"
        />
      );
    case "PICKUP_VERIFICATION":
      return <CargoConfirmation shipmentId={job.shipmentId} />;
    case "LOADED":
      return (
        <ActionButton
          label="Start Transit"
          url={`/api/driver/jobs/${job.shipmentId}/start-transit`}
        />
      );
    case "IN_TRANSIT":
      return (
        <ActionButton
          label="Arrived at Delivery"
          url={`/api/driver/jobs/${job.shipmentId}/arrived-delivery`}
        />
      );
    case "ARRIVED_DELIVERY":
      return (
        <CodeVerificationForm
          url={`/api/driver/jobs/${job.shipmentId}/verify-delivery`}
          label="Enter the delivery code"
        />
      );
    case "DELIVERY_VERIFICATION":
      return (
        <ActionButton
          label="Complete Delivery"
          url={`/api/driver/jobs/${job.shipmentId}/complete-delivery`}
        />
      );
    case "DELIVERED":
      return <p style={{ fontWeight: 600 }}>Delivered. Nice work.</p>;
    case "INCIDENT_REPORTED":
      return (
        <p style={{ color: "var(--muted-on-light)" }}>
          Issue reported. Dispatch has been notified — wait for further
          instructions.
        </p>
      );
    default:
      return null;
  }
}

export function DriverJobWorkflow({ job }: { job: DriverJobDetail }) {
  const showPickupDetails = [
    "ASSIGNED",
    "DRIVER_EN_ROUTE_PICKUP",
    "ARRIVED_PICKUP",
    "PICKUP_VERIFICATION",
  ].includes(job.status);
  const showDeliveryDetails = [
    "LOADED",
    "IN_TRANSIT",
    "ARRIVED_DELIVERY",
    "DELIVERY_VERIFICATION",
  ].includes(job.status);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Job</h1>
          <p className={styles.confidentialBanner}>
            CONFIDENTIAL SHIPMENT — do not photograph contents, do not open
            packaging, verify recipient before release.
          </p>
        </div>
      </div>

      <div className="container">
        <div className={styles.main}>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Cargo</span>
              <span className={styles.rowValue}>
                {job.cargoType}
                {job.palletCount ? ` (${job.palletCount} pallets)` : ""} —{" "}
                {job.approxWeightKg} kg
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Scheduled</span>
              <span className={styles.rowValue}>
                {job.scheduledFor
                  ? new Date(job.scheduledFor).toLocaleString()
                  : "As soon as possible"}
              </span>
            </div>
          </div>

          {showPickupDetails && (
            <div className={styles.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pickup</h2>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Address</span>
                <span className={styles.rowValue}>
                  {job.pickupLine1}, {job.pickupCity}, {job.pickupState}{" "}
                  {job.pickupPostalCode}
                </span>
              </div>
              {job.pickupContactName && (
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Contact</span>
                  <span className={styles.rowValue}>
                    {job.pickupContactName} — {job.pickupContactPhone}
                  </span>
                </div>
              )}
              <div className={styles.row}>
                <span className={styles.rowLabel}>Loading</span>
                <span className={styles.rowValue}>
                  {[
                    job.pickupForkliftAvailable && "Forklift available",
                    job.pickupDockAvailable && "Dock available",
                    job.pickupCustomerLoading && "Customer loading",
                    job.pickupDriverAssistNeeded && "Driver assistance needed",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </div>
            </div>
          )}

          {showDeliveryDetails && (
            <div className={styles.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Delivery</h2>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Address</span>
                <span className={styles.rowValue}>
                  {job.deliveryLine1}, {job.deliveryCity}, {job.deliveryState}{" "}
                  {job.deliveryPostalCode}
                </span>
              </div>
              {job.deliveryContactName && (
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Contact</span>
                  <span className={styles.rowValue}>
                    {job.deliveryContactName} — {job.deliveryContactPhone}
                  </span>
                </div>
              )}
              <div className={styles.row}>
                <span className={styles.rowLabel}>Unloading</span>
                <span className={styles.rowValue}>
                  {[
                    job.deliveryForkliftAvailable && "Forklift available",
                    job.deliveryDockAvailable && "Dock available",
                    job.deliveryReceiverUnloading && "Receiver unloading",
                    job.deliveryDriverAssistNeeded && "Driver assistance needed",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <StageContent job={job} />
          </div>
        </div>
      </div>
    </div>
  );
}
