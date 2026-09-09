import styles from "./Security.module.css";
import {
  ConfidentialIcon,
  VerifiedRecipientIcon,
  SignedPodIcon,
} from "./icons.tsx";

const ITEMS = [
  {
    Icon: ConfidentialIcon,
    title: "Confidential by default",
    body: "Every shipment ships without cargo details shared beyond what a driver needs to complete it.",
  },
  {
    Icon: VerifiedRecipientIcon,
    title: "Verified recipient confirmation",
    body: "Delivery is confirmed by signature, PIN, or QR code — never released to the wrong hands.",
  },
  {
    Icon: SignedPodIcon,
    title: "Signed proof of delivery",
    body: "A signed record of delivery lands in your account the moment it's complete.",
  },
];

export function Security() {
  return (
    <div id="security" className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.intro}>
          <p className="eyebrow">Security &amp; Confidentiality</p>
          <h2 className={styles.heading}>
            Your cargo&rsquo;s privacy isn&rsquo;t an add-on. It&rsquo;s how we operate.
          </h2>
        </div>
        <div className={styles.grid}>
          {ITEMS.map(({ Icon, title, body }) => (
            <div key={title} className={styles.item}>
              <Icon width={26} height={26} stroke="var(--ink)" />
              <h3 className={styles.itemTitle}>{title}</h3>
              <p className={styles.itemBody}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
