import styles from "./TrustBar.module.css";
import {
  DedicatedVehicleIcon,
  NoConsolidationIcon,
  SecureDeliveryIcon,
  ProofOfDeliveryIcon,
  RealTimeTrackingIcon,
} from "./icons.tsx";

const ITEMS = [
  { Icon: DedicatedVehicleIcon, label: "Dedicated Vehicle" },
  { Icon: NoConsolidationIcon, label: "No Consolidation" },
  { Icon: SecureDeliveryIcon, label: "Secure Delivery" },
  { Icon: ProofOfDeliveryIcon, label: "Proof of Delivery" },
  { Icon: RealTimeTrackingIcon, label: "Real-Time Tracking" },
];

export function TrustBar() {
  return (
    <div className={styles.bar}>
      <div className={`container ${styles.row}`}>
        {ITEMS.map(({ Icon, label }) => (
          <div key={label} className={styles.item}>
            <Icon width={22} height={22} stroke="var(--ink)" />
            <span className={styles.label}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
