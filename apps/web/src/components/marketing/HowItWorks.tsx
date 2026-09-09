import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    number: "01",
    title: "Tell us pickup & delivery",
    body: "Pickup address, delivery address, and when you need it — now or scheduled.",
  },
  {
    number: "02",
    title: "Describe what you're moving",
    body: "Boxes, pallets, or equipment. Approximate weight and any loading equipment needed.",
  },
  {
    number: "03",
    title: "Get your price and book",
    body: "We match the right dedicated vehicle and give you a price instantly.",
  },
];

export function HowItWorks() {
  return (
    <div id="how-it-works" className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.intro}>
          <p className="eyebrow">How It Works</p>
          <h2 className={styles.heading}>
            Book in three steps. No freight expertise required.
          </h2>
        </div>
        <div className={styles.steps}>
          {STEPS.map((step) => (
            <div key={step.number} className={styles.step}>
              <div className={styles.number}>{step.number}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
