import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Midway Mover",
  description: "The terms governing Midway Mover transportation services.",
};

const section: React.CSSProperties = { marginBottom: 32 };
const h2: React.CSSProperties = { fontSize: 20, marginBottom: 8 };
const p: React.CSSProperties = { color: "var(--muted-on-light)", lineHeight: 1.7, marginBottom: 12 };

export default function TermsPage() {
  return (
    <main className="container" style={{ paddingTop: 64, paddingBottom: 96, maxWidth: 800 }}>
      <p className="eyebrow">Terms of Service</p>
      <h1 style={{ fontSize: 36, margin: "12px 0 8px" }}>Terms of Service</h1>
      <p style={{ ...p, marginBottom: 32 }}>Last updated: October 2026</p>

      <div style={section}>
        <h2 style={h2}>Services</h2>
        <p style={p}>
          Midway Mover provides private, dedicated transportation of boxes,
          pallets (up to 4), and equipment within the Dallas–Fort Worth area.
          Each shipment travels in its own dedicated vehicle with no freight
          consolidation and no intermediate warehouse stops.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Booking and pricing</h2>
        <p style={p}>
          Quotes are generated from the pickup and delivery addresses, cargo
          description, and timing you provide. The price confirmed at booking is
          the price you pay, provided the shipment details do not change. If the
          actual load differs materially from what was described, we may adjust
          the price or decline the shipment.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Your responsibilities</h2>
        <p style={p}>
          You are responsible for accurately describing your cargo, ensuring it
          is properly packed and ready at the scheduled pickup time, and
          providing safe access for loading and unloading. Hazardous materials,
          illegal goods, and items requiring specialized permits are not accepted.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Cancellations</h2>
        <p style={p}>
          You may cancel a booking before a driver is dispatched at no charge.
          Cancellations after dispatch may incur a fee to cover the committed
          vehicle and driver time.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Delivery and proof</h2>
        <p style={p}>
          Delivery is completed upon verified recipient confirmation by
          signature, PIN, or QR code. A signed proof-of-delivery record is made
          available in your account upon completion.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Liability</h2>
        <p style={p}>
          Our liability for loss or damage to cargo is limited to the amount
          stated in your booking confirmation. Claims must be reported within 7
          days of delivery with supporting documentation, including the signed
          proof of delivery.
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>Changes to these terms</h2>
        <p style={p}>
          We may update these terms from time to time. The version in effect at
          the time of your booking governs that shipment.
        </p>
      </div>
    </main>
  );
}
