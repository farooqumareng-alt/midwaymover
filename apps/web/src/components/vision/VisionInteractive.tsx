"use client";

import { useState } from "react";
import styles from "./vision.module.css";

const ROADMAP: Record<string, { era: string; body: string; list: string[] }> = {
  "1": {
    era: "2026–27 · Prove it in DFW",
    body: "One cargo van, two drivers, one metroplex. The goal is to prove the model on real roads: every load dedicated, every delivery documented — and the first repeat business accounts earned rather than bought.",
    list: [
      "Dedicated-only service across Dallas–Fort Worth",
      "Chain-of-custody paperwork on each load",
      "First repeat business accounts",
    ],
  },
  "5": {
    era: "By year 5 · A small fleet, if demand earns it",
    body: "A few vans and the first operations lead who isn't a founder — added only as demand earns them. Business accounts, standing routes for firms that can't afford a missed load, become a larger share of revenue, and Texas runs on request become routine where capacity allows.",
    list: [
      "A small fleet, each van dedicated to one load at a time",
      "Texas dedicated runs where capacity allows",
      "Business accounts a growing share of revenue",
      "Driver training written down as a manual",
    ],
  },
  "10": {
    era: "By year 10 · A second home, earned",
    body: "A second Texas metro hub, opened only when DFW routes support it. Larger vehicles join when customer loads — not ambition — require them. The first leadership succession is documented and rehearsed.",
    list: [
      "Second Texas hub, earned by route demand",
      "Vehicle classes added by load demand",
      "Succession plan documented and rehearsed",
    ],
  },
  "25": {
    era: "By year 25 · A regional name",
    body: "A regional dedicated network across nearby states, grown hub by hub, with the same one-load model in each market.",
    list: [
      "Regional network, one hub at a time",
      "The founding standard taught by its second generation",
    ],
  },
  "50": {
    era: "By year 50 · Hubs in major metros",
    body: "Dedicated hubs in major metros, with routing and paperwork handled by software and custody still handled by named drivers.",
    list: [
      "Major-metro footprint, hub by hub",
      "A decades-long custody record as the company's asset",
    ],
  },
  "100": {
    era: "Year 100 · 2126 · The same promise",
    body: "A century in, the vehicles and software will have changed; the offer has not: one load, one vehicle, no consolidation.",
    list: [
      "One load. One vehicle. No consolidation.",
      "Governance designed to outlive the founders",
    ],
  },
};

const YEARS = ["1", "5", "10", "25", "50", "100"];

export function VisionRoadmap() {
  const [year, setYear] = useState("1");
  const r = ROADMAP[year];
  return (
    <div className={styles.roadmap}>
      <h3>The 100-year roadmap</h3>
      <p className={styles.roadmapSub}>
        Select a horizon to see what Midway Mover intends to be at that point.
      </p>
      <div className={styles.yearTabs} role="tablist" aria-label="Roadmap horizons">
        {YEARS.map((y) => (
          <button
            key={y}
            role="tab"
            aria-selected={year === y}
            className={styles.yearTab}
            onClick={() => setYear(y)}
          >
            Year {y}
          </button>
        ))}
      </div>
      <p className={styles.yearEra}>{r.era}</p>
      <p className={styles.yearBody}>{r.body}</p>
      <ul className={styles.yearList}>
        {r.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const FAQS = [
  {
    q: "How is this different from shipping LTL or with a courier?",
    a: "LTL carriers consolidate many customers' freight and route it through terminals, where a load typically changes hands 4–6 times. Couriers optimize for small parcels across a network. Midway Mover reserves the van for one customer's load and drives it directly, with documented custody at pickup and delivery.",
  },
  {
    q: "What can the van carry?",
    a: "Most mid-size cargo: boxes and files, one to four standard pallets depending on height and weight, equipment and instruments, furniture and fixtures, and event gear. Share dimensions and weight when you book; we confirm the fit before accepting the job. For equipment and machinery, tell us about loading access — dock, forklift on site, ground level, or stairs. The driver can decline a load that can't be loaded or carried safely.",
  },
  {
    q: "How far will you go?",
    a: "Same-day delivery is across DFW, capacity permitting. Dedicated runs statewide in Texas are available on request, and regional runs beyond Texas — including Oklahoma City — are also available on request. Long runs are planned around driver hours-of-service limits, which may mean a second driver or a scheduled rest stop. If a distance doesn't make sense for one van, we'll tell you plainly rather than overpromise.",
  },
  {
    q: "My load is sensitive. How is confidentiality handled?",
    a: "Confidentiality is the default: an unmarked vehicle, job details shared only with the driver on the run, and delivery confirmed to you. Photos are taken for standard loads only — never for confidential, legal, medical, or prototype freight without your consent. If you need an NDA on file before the first load, say so in the booking notes.",
  },
  {
    q: "What about medical, lab, or high-value loads?",
    a: "Ask before booking. Regulated medical transport may need certifications, and we will tell you plainly whether we are the right carrier for a regulated load. For high-value loads, ask about declared-value coverage before booking, so the value is documented and covered as agreed.",
  },
  {
    q: "How do business accounts and standing routes work?",
    a: "Regular shippers arrange a standing schedule — daily or weekly runs where capacity allows, or on-call runs — at account pricing, billed on one invoice. The same driver covers your runs where possible. Start with a single run; accounts grow out of loads that went well.",
  },
];

export function VisionFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className={styles.section}>
      <div className="container">
        <p className={styles.eyebrow}>Questions</p>
        <h2 className={styles.h2}>Asked often, answered straight</h2>
        <div className={styles.faq}>
          {FAQS.map((f, i) => (
            <div key={f.q} className={styles.faqItem}>
              <button
                className={styles.faqQ}
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {f.q}
                <span aria-hidden="true">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && <p className={styles.faqA}>{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const LOAD_TYPES = [
  "Boxes / documents",
  "Pallet(s)",
  "Equipment / instruments",
  "Furniture / fixtures",
  "Sensitive / confidential",
  "Business account / standing route",
  "Other — described below",
];

const SIZES = [
  "A few boxes — front of the van",
  "Half the van",
  "The full van",
  "Not sure — help me size it",
];

export function VisionBooking() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [date, setDate] = useState("");
  const [loadType, setLoadType] = useState(LOAD_TYPES[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [confidential, setConfidential] = useState("Standard (already discreet)");
  const [notes, setNotes] = useState("");
  const [brief, setBrief] = useState("");
  const [copied, setCopied] = useState(false);

  function buildBrief() {
    const lines = [
      "MIDWAY MOVER — BOOKING BRIEF",
      "",
      `Name: ${name || "—"}`,
      company ? `Company: ${company}` : null,
      `Pickup: ${pickup || "—"}`,
      `Delivery: ${delivery || "—"}`,
      `Preferred date: ${date || "—"}`,
      `Load type: ${loadType}`,
      `Rough size: ${size}`,
      `Confidential handling: ${confidential}`,
      notes ? `Notes: ${notes}` : null,
      "",
      "Take this brief to midwaymover.com/book to send it and get your quote.",
    ].filter(Boolean);
    setBrief(lines.join("\n"));
    setCopied(false);
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function downloadBrief() {
    const blob = new Blob([brief], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "midway-mover-booking-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="book-vision" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <p className={styles.eyebrow}>Book</p>
        <h2 className={styles.h2}>Book your load</h2>
        <p className={styles.lede}>
          This form builds a booking brief in your own words. Copy the brief,
          then continue on the booking page at midwaymover.com/book to send it
          and get your quote. Booking is web-first — there is no published phone
          line yet.
        </p>
        <div className={styles.bookingGrid}>
          <div>
            <div className={styles.field}>
              <label htmlFor="vb-name">Your name</label>
              <input id="vb-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="vb-company">Company (optional)</label>
              <input id="vb-company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="vb-pickup">Pickup city</label>
              <input id="vb-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="vb-delivery">Delivery city</label>
              <input id="vb-delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="vb-date">Preferred date</label>
              <input id="vb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className={styles.field}>
              <span id="vb-loadtype-label" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Load type</span>
              <div className={styles.radioRow} role="group" aria-labelledby="vb-loadtype-label">
                {LOAD_TYPES.map((t) => (
                  <button key={t} type="button" className={styles.radioChip}
                    aria-pressed={loadType === t} onClick={() => setLoadType(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <span id="vb-size-label" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Rough size</span>
              <div className={styles.radioRow} role="group" aria-labelledby="vb-size-label">
                {SIZES.map((s) => (
                  <button key={s} type="button" className={styles.radioChip}
                    aria-pressed={size === s} onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <span id="vb-conf-label" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Confidential handling</span>
              <div className={styles.radioRow} role="group" aria-labelledby="vb-conf-label">
                {["Standard (already discreet)", "Required — NDA / special instructions"].map((c) => (
                  <button key={c} type="button" className={styles.radioChip}
                    aria-pressed={confidential === c} onClick={() => setConfidential(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="vb-notes">Anything we should know?</label>
              <textarea id="vb-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button type="button" className="btnPrimary" onClick={buildBrief}>
              Build my booking brief
            </button>
          </div>
          <div className={styles.briefBox}>
            <h3>Your booking brief</h3>
            <p className={styles.briefText}>
              {brief || "Your brief will appear here — your load, described in your own words, ready to copy and take to the booking page."}
            </p>
            <div className={styles.briefActions}>
              <button type="button" className={styles.btnSecondary} onClick={copyBrief} disabled={!brief}>
                {copied ? "Copied ✓" : "Copy brief"}
              </button>
              <button type="button" className={styles.btnSecondary} onClick={downloadBrief} disabled={!brief}>
                Download .txt
              </button>
              <a href="/book" className={styles.btnSecondary}>Open booking page</a>
            </div>
            <p className={styles.socialLine}>
              Find us as @midwaymover on Facebook, Instagram, and Threads. The
              brief stays in your browser — nothing is sent until you send it on
              the booking page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
