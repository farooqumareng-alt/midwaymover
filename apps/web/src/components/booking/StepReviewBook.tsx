"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BookingFlow.module.css";
import type { BookingFormState, QuoteApiResult } from "./types.ts";

interface Props {
  form: BookingFormState;
  onChange: (patch: Partial<BookingFormState>) => void;
  onBack: () => void;
}

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const CARGO_LABELS: Record<string, string> = {
  BOXES_PACKAGES: "Boxes / Packages",
  PALLETS: "Pallets",
  EQUIPMENT_MACHINERY: "Equipment / Machinery",
  OTHER: "Other",
};

const VEHICLE_LABELS: Record<string, string> = {
  MINIVAN: "Minivan",
  PICKUP_TRUCK: "Pickup truck",
  CARGO_VAN: "Cargo van",
  SPRINTER_CLASS_VAN: "Sprinter-class van",
};

export function StepReviewBook({ form, onChange, onBack }: Props) {
  const [quote, setQuote] = useState<QuoteApiResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    async function fetchQuote() {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickup: form.pickup,
            delivery: form.delivery,
            scheduledFor: form.scheduleNow
              ? null
              : new Date(form.scheduledFor).toISOString(),
            cargoType: form.cargoType,
            palletCount: form.palletCount,
            approxWeightKg: Number(form.approxWeightKg),
            lengthCm: form.lengthCm ? Number(form.lengthCm) : null,
            widthCm: form.widthCm ? Number(form.widthCm) : null,
            heightCm: form.heightCm ? Number(form.heightCm) : null,
            pickupForkliftAvailable: form.pickupForkliftAvailable,
            pickupDockAvailable: form.pickupDockAvailable,
            pickupCustomerLoading: form.pickupCustomerLoading,
            pickupDriverAssistNeeded: form.pickupDriverAssistNeeded,
            deliveryForkliftAvailable: form.deliveryForkliftAvailable,
            deliveryDockAvailable: form.deliveryDockAvailable,
            deliveryReceiverUnloading: form.deliveryReceiverUnloading,
            deliveryDriverAssistNeeded: form.deliveryDriverAssistNeeded,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setQuoteError(body.error ?? "Could not get a price. Please try again.");
          return;
        }
        const data: QuoteApiResult = await res.json();
        setQuote(data);
      } catch {
        setQuoteError("Could not reach the server. Check your connection and try again.");
      } finally {
        setQuoteLoading(false);
      }
    }

    void fetchQuote();
    // Deliberately runs once per mount — see requestedRef. The form data
    // captured in this closure is a one-time snapshot for this quote
    // request; going "back" and changing answers re-mounts this step
    // (BookingFlow keys/unmounts on step change) and gets a fresh quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBook() {
    if (!quote || quote.status !== "quoted") return;

    const errors: Record<string, string> = {};
    if (!form.contactName.trim()) errors.contactName = "Required.";
    if (!form.contactPhone.trim()) errors.contactPhone = "Required.";
    if (!form.contactEmail.trim() || !form.contactEmail.includes("@")) {
      errors.contactEmail = "Enter a valid email.";
    }
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBookingState("submitting");
    setBookingError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setBookingError(body.error ?? "Could not complete booking. Please try again.");
        setBookingState("error");
        return;
      }
      const successBody = await res.json();
      setTrackingToken(successBody.trackingToken ?? null);
      setPickupCode(successBody.pickupCode ?? null);
      setDeliveryCode(successBody.deliveryCode ?? null);
      setBookingState("success");
    } catch {
      setBookingError("Could not reach the server. Check your connection and try again.");
      setBookingState("error");
    }
  }

  if (bookingState === "success") {
    return (
      <div className={styles.stepBody}>
        <h2 className={styles.sectionTitle}>You&rsquo;re booked</h2>
        <p style={{ color: "var(--muted-on-light)", fontSize: 16, lineHeight: 1.6 }}>
          We&rsquo;ve reserved a dedicated vehicle for your shipment. Our team will
          follow up at {form.contactEmail} to finalize payment and scheduling.
        </p>

        {(pickupCode || deliveryCode) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 20,
              background: "#fff",
              border: "1px solid var(--hairline-light)",
              borderRadius: 6,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600 }}>
              Save these codes — they won&rsquo;t be shown again
            </p>
            {pickupCode && (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted-on-light)" }}>
                  Pickup code — give this to the driver when your cargo is
                  picked up
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.1em" }}>
                  {pickupCode}
                </p>
              </div>
            )}
            {deliveryCode && (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted-on-light)" }}>
                  Delivery code — share this with whoever will receive the
                  shipment
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.1em" }}>
                  {deliveryCode}
                </p>
              </div>
            )}
          </div>
        )}

        {trackingToken && (
          <a href={`/track/${trackingToken}`} className="btnPrimary" style={{ alignSelf: "flex-start" }}>
            Track your shipment
          </a>
        )}
      </div>
    );
  }

  if (quoteLoading) {
    return (
      <div className={styles.stepBody}>
        <p style={{ color: "var(--muted-on-light)" }}>Getting your price…</p>
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className={styles.stepBody}>
        <p className="errorText">{quoteError}</p>
        <div className={styles.navRow}>
          <button type="button" className="btnGhostLight" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (quote?.status === "specialReviewRequired") {
    return (
      <div className={styles.stepBody}>
        <h2 className={styles.sectionTitle}>We&rsquo;ll follow up on this one</h2>
        <p style={{ color: "var(--muted-on-light)", fontSize: 16, lineHeight: 1.6 }}>
          {quote.message}
        </p>
        <div className={styles.navRow}>
          <button type="button" className="btnGhostLight" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!quote || quote.status !== "quoted") return null;

  return (
    <div className={styles.stepBody}>
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 className={styles.sectionTitle}>Review</h2>
        <SummaryRow label="Pickup" value={`${form.pickup.line1}, ${form.pickup.city}, ${form.pickup.state} ${form.pickup.postalCode}`} />
        <SummaryRow label="Delivery" value={`${form.delivery.line1}, ${form.delivery.city}, ${form.delivery.state} ${form.delivery.postalCode}`} />
        <SummaryRow label="When" value={form.scheduleNow ? "As soon as possible" : new Date(form.scheduledFor).toLocaleString()} />
        <SummaryRow
          label="Cargo"
          value={
            form.cargoType === "PALLETS"
              ? `${form.palletCount} pallet${form.palletCount === 1 ? "" : "s"}`
              : (form.cargoType && CARGO_LABELS[form.cargoType]) || ""
          }
        />
        <SummaryRow label="Approximate weight" value={`${form.approxWeightKg} kg`} />
        <SummaryRow label="Dedicated vehicle" value={VEHICLE_LABELS[quote.vehicleClass] ?? quote.vehicleClass} />
        <SummaryRow label="Security" value="Confidential — private, dedicated vehicle" />
      </section>

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 20,
          background: "#fff",
          border: "1px solid var(--hairline-light)",
          borderRadius: 6,
        }}
      >
        <PriceRow label="Base fee" cents={quote.price.baseFeeCents} />
        <PriceRow label="Distance" cents={quote.price.distanceFeeCents} />
        <PriceRow label="Weight" cents={quote.price.weightFeeCents} />
        <div style={{ height: 1, background: "var(--hairline-light)", margin: "4px 0" }} />
        <PriceRow label="Total" cents={quote.price.totalCents} bold />
      </section>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
          Your contact info
        </legend>
        <div className="fieldGrid">
          <div className="field">
            <label className="label" htmlFor="contactName">
              Name
            </label>
            <input
              id="contactName"
              className={`input${contactErrors.contactName ? " hasError" : ""}`}
              value={form.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
              autoComplete="name"
            />
            {contactErrors.contactName && (
              <span className="errorText">{contactErrors.contactName}</span>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="contactPhone">
              Phone
            </label>
            <input
              id="contactPhone"
              className={`input${contactErrors.contactPhone ? " hasError" : ""}`}
              value={form.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
              autoComplete="tel"
              inputMode="tel"
            />
            {contactErrors.contactPhone && (
              <span className="errorText">{contactErrors.contactPhone}</span>
            )}
          </div>
          <div className="field fieldGridFull">
            <label className="label" htmlFor="contactEmail">
              Email
            </label>
            <input
              id="contactEmail"
              className={`input${contactErrors.contactEmail ? " hasError" : ""}`}
              value={form.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              autoComplete="email"
              inputMode="email"
            />
            {contactErrors.contactEmail && (
              <span className="errorText">{contactErrors.contactEmail}</span>
            )}
          </div>
        </div>
      </fieldset>

      {bookingError && <p className="errorText">{bookingError}</p>}

      <div className={styles.navRow}>
        <button type="button" className="btnGhostLight" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btnPrimary"
          onClick={handleBook}
          disabled={bookingState === "submitting"}
        >
          {bookingState === "submitting" ? "Booking…" : "Book Delivery"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 15 }}>
      <span style={{ color: "var(--muted-on-light)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function PriceRow({ label, cents, bold }: { label: string; cents: number; bold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: bold ? 18 : 15,
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span style={{ color: bold ? "var(--ink)" : "var(--muted-on-light)" }}>{label}</span>
      <span>{formatUsd(cents)}</span>
    </div>
  );
}
