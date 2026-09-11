"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DispatchBoard.module.css";
import type {
  AttentionShipment,
  AvailableDriver,
  AvailableVehicle,
} from "../../lib/dispatch.ts";

interface Props {
  shipments: AttentionShipment[];
  drivers: AvailableDriver[];
  vehicles: AvailableVehicle[];
  isAdmin: boolean;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function OverrideConfirmForm({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson(
      `/api/dispatch/shipments/${shipmentId}/override-confirm`,
      { reason },
    );
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Could not confirm.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        className="input"
        placeholder="Reason (e.g. invoiced business account)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && <span className="errorText">{error}</span>}
      <button type="button" className="btnPrimary" onClick={submit} disabled={busy}>
        {busy ? "Confirming…" : "Confirm without payment"}
      </button>
    </div>
  );
}

function AssignForm({
  shipmentId,
  requiredVehicleClass,
  drivers,
  vehicles,
}: {
  shipmentId: string;
  requiredVehicleClass: string | null;
  drivers: AvailableDriver[];
  vehicles: AvailableVehicle[];
}) {
  const router = useRouter();
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const matchingVehicles = vehicles.filter(
    (v) => !requiredVehicleClass || v.vehicleClass === requiredVehicleClass,
  );

  async function submit() {
    if (!driverId || !vehicleId) {
      setError("Select a driver and a vehicle.");
      return;
    }
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson(`/api/dispatch/shipments/${shipmentId}/assign`, {
      driverId,
      vehicleId,
      reason: null,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Could not assign.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <select className={styles.select} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
        <option value="">Select driver…</option>
        {drivers.map((d) => (
          <option key={d.driverId} value={d.driverId}>
            {d.name ?? d.email}
          </option>
        ))}
      </select>
      <select className={styles.select} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
        <option value="">Select vehicle…</option>
        {matchingVehicles.map((v) => (
          <option key={v.vehicleId} value={v.vehicleId} disabled={v.needsReview}>
            {v.plate} ({v.vehicleClass}){v.needsReview ? " — needs review" : ""}
          </option>
        ))}
      </select>
      {error && <span className="errorText">{error}</span>}
      <button type="button" className="btnPrimary" onClick={submit} disabled={busy}>
        {busy ? "Assigning…" : "Assign driver"}
      </button>
    </div>
  );
}

function ShipmentCard({
  shipment,
  drivers,
  vehicles,
}: {
  shipment: AttentionShipment;
  drivers: AvailableDriver[];
  vehicles: AvailableVehicle[];
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardRow}>
        <span className={styles.cardLabel}>Status</span>
        <span className={styles.cardValue}>
          {shipment.status}
          {shipment.specialReviewRequired && (
            <span className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginLeft: 8 }}>
              Special review
            </span>
          )}
        </span>
      </div>
      <div className={styles.cardRow}>
        <span className={styles.cardLabel}>Pickup</span>
        <span className={styles.cardValue}>
          {shipment.pickup
            ? `${shipment.pickup.line1}, ${shipment.pickup.city}, ${shipment.pickup.state} ${shipment.pickup.postalCode}`
            : "—"}
        </span>
      </div>
      <div className={styles.cardRow}>
        <span className={styles.cardLabel}>Delivery</span>
        <span className={styles.cardValue}>
          {shipment.delivery
            ? `${shipment.delivery.line1}, ${shipment.delivery.city}, ${shipment.delivery.state} ${shipment.delivery.postalCode}`
            : "—"}
        </span>
      </div>
      <div className={styles.cardRow}>
        <span className={styles.cardLabel}>Cargo</span>
        <span className={styles.cardValue}>
          {shipment.cargoType}
          {shipment.palletCount ? ` (${shipment.palletCount} pallets)` : ""} —{" "}
          {shipment.approxWeightKg} kg
        </span>
      </div>
      <div className={styles.cardRow}>
        <span className={styles.cardLabel}>Required vehicle</span>
        <span className={styles.cardValue}>{shipment.requiredVehicleClass ?? "—"}</span>
      </div>

      {shipment.status === "AWAITING_PAYMENT" && (
        <OverrideConfirmForm shipmentId={shipment.id} />
      )}
      {shipment.status === "AWAITING_ASSIGNMENT" && (
        <AssignForm
          shipmentId={shipment.id}
          requiredVehicleClass={shipment.requiredVehicleClass}
          drivers={drivers}
          vehicles={vehicles}
        />
      )}
    </div>
  );
}

function FleetReview({ vehicles }: { vehicles: AvailableVehicle[] }) {
  const router = useRouter();
  const [busyClass, setBusyClass] = useState<string | null>(null);

  async function markReviewed(vehicleClass: string) {
    setBusyClass(vehicleClass);
    await postJson(`/api/admin/vehicles/${vehicleClass}/review`, {});
    setBusyClass(null);
    router.refresh();
  }

  const byClass = new Map(vehicles.map((v) => [v.vehicleClass, v]));

  return (
    <div>
      <h2 className={styles.sectionTitle}>Fleet Review</h2>
      <div className={styles.vehicleList}>
        {[...byClass.values()].map((v) => (
          <div key={v.vehicleClass} className={styles.card} style={{ minWidth: 200 }}>
            <div className={styles.cardRow}>
              <span className={styles.cardValue}>{v.vehicleClass}</span>
              {v.needsReview ? (
                <span className={`${styles.badge} ${styles.badgeWarn}`}>Needs review</span>
              ) : (
                <span className={styles.badge}>Reviewed</span>
              )}
            </div>
            {v.needsReview && (
              <button
                type="button"
                className="btnGhostLight"
                onClick={() => markReviewed(v.vehicleClass)}
                disabled={busyClass === v.vehicleClass}
              >
                {busyClass === v.vehicleClass ? "Marking…" : "Mark reviewed"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DispatchBoard({ shipments, drivers, vehicles, isAdmin }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Dispatch</h1>
        </div>
      </div>
      <div className="container">
        <div className={styles.main}>
          {isAdmin && <FleetReview vehicles={vehicles} />}

          <div>
            <h2 className={styles.sectionTitle}>
              Shipments needing attention ({shipments.length})
            </h2>
            <div className={styles.shipmentList}>
              {shipments.length === 0 && (
                <p style={{ color: "var(--muted-on-light)" }}>Nothing needs attention.</p>
              )}
              {shipments.map((s) => (
                <ShipmentCard key={s.id} shipment={s} drivers={drivers} vehicles={vehicles} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
