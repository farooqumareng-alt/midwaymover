import Link from "next/link";
import styles from "./DriverJobList.module.css";
import type { DriverJobSummary } from "../../lib/driver.ts";

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "New — accept job",
  DRIVER_EN_ROUTE_PICKUP: "En route to pickup",
  ARRIVED_PICKUP: "At pickup",
  PICKUP_VERIFICATION: "Verifying pickup",
  LOADED: "Loaded — ready to depart",
  IN_TRANSIT: "In transit",
  ARRIVED_DELIVERY: "At delivery",
  DELIVERY_VERIFICATION: "Verifying delivery",
};

export function DriverJobList({ jobs }: { jobs: DriverJobSummary[] }) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Your Jobs</h1>
        </div>
      </div>
      <div className="container">
        <div className={styles.main}>
          {jobs.length === 0 && (
            <p style={{ color: "var(--muted-on-light)" }}>No active jobs right now.</p>
          )}
          {jobs.map((job) => (
            <Link key={job.shipmentId} href={`/driver/jobs/${job.shipmentId}`} className={styles.jobCard}>
              <div className={styles.jobRoute}>
                {job.pickupCity ?? "—"}, {job.pickupState ?? "—"} &rarr; {job.deliveryCity ?? "—"},{" "}
                {job.deliveryState ?? "—"}
              </div>
              <div className={styles.jobMeta}>
                {job.cargoType}
                {job.palletCount ? ` · ${job.palletCount} pallets` : ""} · {job.approxWeightKg} kg
              </div>
              <div className={styles.jobMeta}>
                {job.scheduledFor
                  ? new Date(job.scheduledFor).toLocaleString()
                  : "As soon as possible"}
              </div>
              <span className={styles.jobStatus}>
                {STATUS_LABELS[job.status] ?? job.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
