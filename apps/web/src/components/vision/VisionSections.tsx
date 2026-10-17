import styles from "./vision.module.css";

export function VisionHero() {
  return (
    <section className={styles.hero}>
      <div className="container">
        <p className={styles.heroEyebrow}>Built for 100 years · Dallas–Fort Worth</p>
        <h1 className={styles.heroTitle}>One load. One vehicle. No consolidation.</h1>
        <p className={styles.heroQuote}>
          &ldquo;Your freight, alone, in trusted hands — pickup to delivery.&rdquo;
        </p>
        <p className={styles.heroBody}>
          Midway Mover is a private dedicated cargo service — one cargo van, two
          drivers, based in Dallas–Fort Worth. When you book us, the van carries
          your freight only and drives directly from pickup to delivery. On
          longer Texas runs, the plan may include a second driver or a scheduled
          rest stop, so driver hours-of-service limits are respected.
        </p>
        <div className={styles.heroCtas}>
          <a href="/book" className="btnPrimary">Book your load</a>
          <a href="#standard" className="btnGhostDark">See how it works</a>
        </div>
        <ul className={styles.ticks}>
          <li><span className={styles.tickMark}>✓</span> Dedicated vehicle — your load is the only load on board</li>
          <li><span className={styles.tickMark}>✓</span> Direct route — pickup to delivery, no warehouse stops</li>
          <li><span className={styles.tickMark}>✓</span> Documented custody — signed at pickup and at delivery</li>
          <li><span className={styles.tickMark}>✓</span> Confidential by default — your freight is your business</li>
          <li><span className={styles.tickMark}>✓</span> Honest scale — one van, two drivers, growing deliberately</li>
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Book the van",
    body: "Tell us what it is, where it is, and where it's going — booking is web-first, through the booking page. You get a quote for the whole vehicle, not a per-pound puzzle.",
  },
  {
    n: "2",
    title: "We load — only yours",
    body: "Your driver loads and secures your freight and closes the doors. For standard loads, we photograph it in place. Confidential, legal, medical, and prototype loads are not photographed without your consent.",
  },
  {
    n: "3",
    title: "Direct drive",
    body: "The van drives directly to the delivery address — no terminals, no cross-docks. On long runs, a second driver or a rest stop may be scheduled to respect hours-of-service limits.",
  },
  {
    n: "4",
    title: "Signed delivery",
    body: "The driver unloads, the receiver signs, and you get confirmation of delivery — with a delivery photo on standard loads, or where you have given consent.",
  },
];

export function VisionStandard() {
  return (
    <section id="standard" className={styles.section}>
      <div className="container">
        <p className={styles.eyebrow}>The Midway Standard</p>
        <h2 className={styles.h2}>Four steps. Loaded once, unloaded once.</h2>
        <p className={styles.lede}>
          Consolidated freight typically changes hands 4–6 times before it
          reaches you. A Midway load is loaded at pickup and unloaded at
          delivery, with the run documented at both ends.
        </p>
        <div className={styles.steps}>
          {STEPS.map((s) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  {
    n: "01",
    title: "Boxes & packages",
    body: "Boxes, files, documents, parts, and materials driven directly across DFW — same-day across DFW, capacity permitting. Texas and regional runs are available on request.",
    best: "Contractors, shops, and offices on a deadline",
  },
  {
    n: "02",
    title: "Pallets (1–4)",
    body: "One to four standard pallets, depending on height and weight — loaded once at pickup and unloaded once at delivery. Share dimensions and weight when you book so we can confirm the fit.",
    best: "Warehouses, vendors, and suppliers",
  },
  {
    n: "03",
    title: "Equipment & machinery",
    body: "Tools, instruments, trade-show and event gear, and machinery that needs to arrive un-scuffed and on schedule. Before booking, tell us about loading access — dock, forklift on site, ground level, or stairs — so the load can be handled safely. The driver can decline a load that cannot be loaded or carried safely.",
    best: "Crews, vendors, and events with a set schedule",
  },
  {
    n: "04",
    title: "Business accounts",
    body: "Recurring runs for businesses that ship regularly — scheduled where capacity allows, at account pricing, on one invoice. Start with a single run; accounts grow out of loads that went well.",
    best: "Businesses with recurring DFW movement",
  },
];

export function VisionServices() {
  return (
    <section id="services" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <p className={styles.eyebrow}>Services</p>
        <h2 className={styles.h2}>What the van carries</h2>
        <p className={styles.lede}>
          Mid-size cargo is our whole business: loads that are too important to
          put on a consolidated truck, or too urgent or sensitive to wait. If it
          fits in the van and matters to you, tell us about it.
        </p>
        <div className={styles.cards}>
          {SERVICES.map((s) => (
            <div key={s.n} className={styles.card}>
              <span className={styles.cardNum}>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <p className={styles.cardBest}><strong>Best for:</strong> {s.best}</p>
            </div>
          ))}
        </div>

        <div className={styles.panel}>
          <h3>What fits in the van?</h3>
          <ul className={styles.chips}>
            <li>Boxes, files &amp; documents</li>
            <li>Palletized goods (1–4 pallets)</li>
            <li>Tools, parts &amp; equipment</li>
            <li>Furniture &amp; fixtures</li>
            <li>Event &amp; trade-show gear</li>
            <li>Sensitive &amp; high-value items</li>
          </ul>
          <p className={styles.lede} style={{ fontSize: 15 }}>
            A full-size cargo van handles most mid-size loads. Tell us the
            dimensions and weight when you book and we&rsquo;ll confirm the fit
            before we take the job. Our promise on fit: if a load can&rsquo;t ride
            safely and securely in the van, we say so up front.
          </p>
        </div>

        <div className={styles.panel}>
          <h3>Good to know before you book</h3>
          <ul className={styles.noteList}>
            <li><strong>Photos and confidentiality:</strong> Photos are taken for standard loads only — never for confidential, legal, medical, or prototype freight without your consent.</li>
            <li><strong>Medical and lab material:</strong> Regulated medical transport may need certifications — ask before booking, so we can tell you plainly whether we are the right carrier for it.</li>
            <li><strong>High-value loads:</strong> Ask about declared-value coverage before booking, so the value of the load is documented and covered as agreed.</li>
            <li><strong>Loading access:</strong> Tell us about loading access — dock, forklift on site, ground level, or stairs — when you book, especially for equipment and machinery.</li>
            <li><strong>Long runs:</strong> Statewide and regional runs are planned around driver hours-of-service limits, which may mean a second driver or a scheduled rest stop.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function VisionCompare() {
  return (
    <section className={styles.section}>
      <div className="container">
        <p className={styles.eyebrow}>Why dedicated</p>
        <h2 className={styles.h2}>Two ways freight moves</h2>
        <p className={styles.lede}>
          Most cargo services make money by filling a vehicle with many
          customers&rsquo; freight. That is efficient — for them. Midway Mover is
          built on the opposite idea.
        </p>
        <div className={styles.compare}>
          <div className={`${styles.compareCol} ${styles.compareUs}`}>
            <h3>Midway Mover</h3>
            <p className={styles.compareSub}>Private dedicated vehicle</p>
            <ul>
              <li>Your freight is the only freight on board</li>
              <li>Loaded once, unloaded once — documented at both ends</li>
              <li>Direct route, scheduled around your run</li>
              <li>Confidential: unmarked van, no shared manifest</li>
              <li>Priced per vehicle, quoted up front</li>
            </ul>
          </div>
          <div className={`${styles.compareCol} ${styles.compareThem}`}>
            <h3>Consolidated LTL</h3>
            <p className={styles.compareSub}>Shared truck, terminal network</p>
            <ul>
              <li>Your freight rides beside strangers&rsquo; freight</li>
              <li>4–6 hand-offs through terminals &amp; cross-docks</li>
              <li>Routed for the network&rsquo;s efficiency, not yours</li>
              <li>Manifest visible at every stop</li>
              <li>Priced by weight, class, and surcharges</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function VisionArea() {
  return (
    <section id="area" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <p className={styles.eyebrow}>Service area</p>
        <h2 className={styles.h2}>Based in DFW. Texas and regional runs on request.</h2>
        <p className={styles.lede}>
          We&rsquo;re based in the middle of the Metroplex — midway between
          Dallas and Fort Worth. DFW is home ground. Statewide Texas runs are
          available on request, and regional runs beyond Texas — including
          Oklahoma City — are also available on request.
        </p>
        <div className={styles.panel}>
          <h3>Across DFW</h3>
          <ul className={styles.chips}>
            <li>Dallas</li>
            <li>Fort Worth</li>
            <li>Arlington</li>
            <li>Plano</li>
            <li>Irving</li>
            <li>Frisco</li>
            <li>Garland</li>
            <li>Grand Prairie</li>
          </ul>
          <p className={styles.lede} style={{ fontSize: 15 }}>
            Same-day across DFW, capacity permitting — this is home ground, and
            where most routes begin and end.
          </p>
        </div>
        <div className={styles.panel}>
          <h3>Beyond DFW, on request</h3>
          <p className={styles.lede} style={{ fontSize: 15 }}>
            Dedicated single-load runs statewide in Texas — Austin, Houston, San
            Antonio, Waco, Tyler — available on request, and regional runs beyond
            Texas, including Oklahoma City, also on request. Long runs are
            planned around driver hours-of-service limits.
          </p>
        </div>
      </div>
    </section>
  );
}

const VALUES = [
  { title: "Custody", body: "Your freight is our responsibility from pickup to signed delivery." },
  { title: "Directness", body: "Straight routes, straight quotes, straight answers." },
  { title: "Discretion", body: "What you ship is your business; job details stay with the driver on the run." },
  { title: "Stewardship", body: "Maintain the vehicle and protect the name; the business is built to last." },
  { title: "Patience", body: "Grow at the speed trust and capacity allow." },
];

export function VisionAbout() {
  return (
    <section id="legacy" className={styles.section}>
      <div className="container">
        <p className={styles.eyebrow}>About</p>
        <h2 className={styles.h2}>Started with one van. Planned for the long term.</h2>
        <p className={styles.lede}>
          Midway Mover began in Dallas–Fort Worth with a single cargo van and
          two drivers — and a refusal to run freight the way consolidated
          carriers do. We&rsquo;re bootstrapped and growing slowly on purpose, at
          the speed our capacity and our customers&rsquo; trust allow.
        </p>
        <div className={styles.values}>
          {VALUES.map((v) => (
            <div key={v.title} className={styles.value}>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.constantGrid}>
          <div className={styles.constantCol}>
            <h3>What stays constant</h3>
            <ul className={styles.noteList}>
              <li>Things will still need to move, physically, from one pair of hands to another</li>
              <li>Trust is earned per load — custody stays a human responsibility</li>
              <li>Some freight is sensitive; discretion stays worth paying for</li>
              <li>People want a name and a face accountable for their goods</li>
            </ul>
          </div>
          <div className={styles.constantCol}>
            <h3>What will change — and our answer</h3>
            <ul className={styles.noteList}>
              <li><strong>Vehicles:</strong> vans will electrify and assist their drivers — the promise rides in any vehicle</li>
              <li><strong>Routing &amp; booking:</strong> software will get smarter — we adopt tools, and keep the standard ours</li>
              <li><strong>The map:</strong> DFW → Texas → further, one earned hub at a time</li>
              <li><strong>The crew:</strong> drivers become career custodians, trained and retained</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function VisionBusiness() {
  return (
    <section id="business-vision" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <p className={styles.eyebrow}>For business</p>
        <h2 className={styles.h2}>Business accounts, without the runaround</h2>
        <p className={styles.lede}>
          When a part, a file, or a pallet is late, your whole day slips.
          Business accounts give regular shippers a standing arrangement:
          recurring runs scheduled where capacity allows, account pricing, the
          same driver where possible, and one invoice for the period — no
          per-run paperwork chase.
        </p>
        <p className={styles.lede} style={{ marginTop: 16 }}>
          Warehouses and partners can hand us freight the same way. We handle it
          like it&rsquo;s ours to protect — because for the trip, it is.
        </p>
        <p className={styles.lede} style={{ marginTop: 16 }}>
          Start with a single run through the booking page and choose
          &ldquo;Business account / standing route&rdquo; as the load type.
        </p>
        <div className={styles.heroCtas} style={{ marginTop: 24, marginBottom: 0 }}>
          <a href="/book" className="btnPrimary">Start with a single run</a>
        </div>
      </div>
    </section>
  );
}
