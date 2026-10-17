import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Midway Mover",
  description: "How Midway Mover collects, uses, and protects your information.",
};

const section: React.CSSProperties = { marginBottom: 32 };
const h2: React.CSSProperties = { fontSize: 20, marginBottom: 8 };
const p: React.CSSProperties = { color: "var(--muted-on-light)", lineHeight: 1.7, marginBottom: 12 };

export default function PrivacyPage() {
  return (
    <main className="container" style={{ paddingTop: 64, paddingBottom: 96, maxWidth: 800 }}>
      <p className="eyebrow">Privacy Policy</p>
      <h1 style={{ fontSize: 36, margin: "12px 0 8px" }}>Privacy Policy</h1>
      <p style={{ ...p, marginBottom: 32 }}>Last updated: October 2026</p>

      <div style={section}>
        <h2 style={h2}>Information we collect</h2>
        <p style={p}>
          When you book a shipment, we collect the details needed to complete it:
          pickup and delivery addresses, contact names, phone numbers, email
          addresses, and a description of the cargo (type, weight, handling needs).
          We also collect delivery confirmations (signature, PIN, or QR scan) as
          proof of delivery.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>How we use it</h2>
        <p style={p}>
          Your information is used to schedule and complete your shipment,
          communicate status updates and tracking, issue invoices and receipts,
          and provide customer support. We do not sell your personal information.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Confidentiality</h2>
        <p style={p}>
          Cargo details are shared only with the driver assigned to your shipment
          and only to the extent needed to complete the pickup and delivery.
          Shipments are never consolidated, so your freight never travels
          alongside another customer&rsquo;s goods.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Data security</h2>
        <p style={p}>
          We use reasonable administrative and technical safeguards to protect
          your information. Proof-of-delivery records are stored securely and
          made available to you through your account.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Your choices</h2>
        <p style={p}>
          You may request a copy of the personal information we hold about you,
          or ask us to correct or delete it, by contacting us through the booking
          page. We will respond within a reasonable time.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Analytics</h2>
        <p style={p}>
          We use Google Analytics to understand how visitors use our website.
          Google Analytics collects anonymized usage data; you can opt out with
          Google&rsquo;s opt-out browser add-on.
        </p>
      </div>
    </main>
  );
}
