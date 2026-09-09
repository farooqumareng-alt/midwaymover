import styles from "./BusinessAccounts.module.css";

export function BusinessAccounts() {
  return (
    <div id="business" className={styles.section}>
      <div className={styles.inner}>
        <p className="eyebrow">Business Accounts</p>
        <h2 className={styles.heading}>
          Running recurring shipments? Bring your whole team.
        </h2>
        <p className={styles.body}>
          Business accounts let your team book, track, and manage shipments
          together, with one invoice for the organization.
        </p>
        <a href="#" className="btnGhostLight" style={{ marginTop: 4 }}>
          Talk to us about business accounts
        </a>
      </div>
    </div>
  );
}
