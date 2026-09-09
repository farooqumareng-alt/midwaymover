import styles from "./ClosingCta.module.css";

export function ClosingCta() {
  return (
    <div className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <h2 className={styles.heading}>
          Ready to book your first dedicated pickup?
        </h2>
        <button type="button" className="btnPrimary">
          Get a Quote
        </button>
      </div>
    </div>
  );
}
