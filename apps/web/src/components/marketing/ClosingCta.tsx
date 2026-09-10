import Link from "next/link";
import styles from "./ClosingCta.module.css";

export function ClosingCta() {
  return (
    <div className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <h2 className={styles.heading}>
          Ready to book your first dedicated pickup?
        </h2>
        <Link href="/book" className="btnPrimary">
          Get a Quote
        </Link>
      </div>
    </div>
  );
}
