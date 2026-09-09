import styles from "./WhatWeMove.module.css";
import { BoxesIcon, PalletsIcon, EquipmentIcon } from "./icons.tsx";

const ITEMS = [
  {
    Icon: BoxesIcon,
    title: "Boxes & Packages",
    body: "From a few boxes to a full load of packages, moved without a warehouse stop in between.",
  },
  {
    Icon: PalletsIcon,
    title: "1–4 Pallets",
    body: "Standard or custom pallets, with forklift or dock pickup and delivery options.",
  },
  {
    Icon: EquipmentIcon,
    title: "Equipment & Machinery",
    body: "Machinery and equipment moved with the driver assistance your load requires.",
  },
];

export function WhatWeMove() {
  return (
    <div id="what-we-move" className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.intro}>
          <p className="eyebrow">What We Move</p>
          <h2 className={styles.heading}>
            Packages, pallets, and equipment — sized for a dedicated vehicle.
          </h2>
        </div>
        <div className={styles.grid}>
          {ITEMS.map(({ Icon, title, body }) => (
            <div key={title} className={styles.card}>
              <Icon width={28} height={28} stroke="var(--accent)" />
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardBody}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
