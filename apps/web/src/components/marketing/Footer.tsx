import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Midway Mover</span>
          <span className={styles.domain}>midwaymover.com</span>
          <span className={styles.credit}>Powered by <a href="https://fixvise.com" target="_blank" rel="noopener">fixvise.com</a></span>
        </div>
        <div className={styles.links}>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/book">Contact</a>
        </div>
      </div>
    </footer>
  );
}
