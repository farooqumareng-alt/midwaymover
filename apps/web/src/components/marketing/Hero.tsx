import Link from "next/link";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <div className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        <p className="eyebrow">
          Private &middot; Dedicated &middot; Direct &middot; Secure &middot; Confidential
        </p>
        <h1 className={styles.headline}>Private. Dedicated. Direct.</h1>
        <p className={styles.subhead}>
          Your cargo travels in its own dedicated vehicle — no freight
          consolidation, no unnecessary stops.
        </p>
        <div className={styles.actions}>
          <Link href="/book" className="btnPrimary">
            Get a Quote
          </Link>
          <a href="#how-it-works" className="btnGhostDark">
            See how it works
          </a>
        </div>
      </div>
    </div>
  );
}
