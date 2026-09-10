"use client";

import { useState } from "react";
import styles from "./BookingFlow.module.css";
import { StepWhereWhen } from "./StepWhereWhen.tsx";
import { StepWhatMoving } from "./StepWhatMoving.tsx";
import { StepReviewBook } from "./StepReviewBook.tsx";
import { INITIAL_FORM_STATE, type AddressFormState, type BookingFormState } from "./types.ts";

const STEP_LABELS = ["Where & When", "What's Moving", "Review & Book"];

function validateAddress(addr: AddressFormState, prefix: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!addr.line1.trim()) errors[`${prefix}.line1`] = "Required.";
  if (!addr.city.trim()) errors[`${prefix}.city`] = "Required.";
  if (!/^[A-Z]{2}$/.test(addr.state)) errors[`${prefix}.state`] = "2-letter state code.";
  if (!/^\d{5}$/.test(addr.postalCode)) errors[`${prefix}.postalCode`] = "5-digit ZIP code.";
  return errors;
}

function validateStep1(form: BookingFormState): Record<string, string> {
  const errors = {
    ...validateAddress(form.pickup, "pickup"),
    ...validateAddress(form.delivery, "delivery"),
  };
  if (!form.scheduleNow && !form.scheduledFor) {
    errors.scheduledFor = "Pick a date and time.";
  }
  return errors;
}

function validateStep2(form: BookingFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.cargoType) errors.cargoType = "Select what you're moving.";
  const weight = Number(form.approxWeightKg);
  if (!form.approxWeightKg || !Number.isFinite(weight) || weight <= 0) {
    errors.approxWeightKg = "Enter the approximate weight.";
  }
  return errors;
}

export function BookingFlow() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BookingFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateForm(patch: Partial<BookingFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function goNext() {
    const stepErrors = step === 1 ? validateStep1(form) : step === 2 ? validateStep2(form) : {};
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <h1 className={styles.title}>Book a Pickup</h1>
          <div className={styles.steps}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className={styles.stepDot} data-active={step === i + 1}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <span>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className={styles.stepDivider} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <div className="container">
          {step === 1 && (
            <>
              <StepWhereWhen form={form} onChange={updateForm} errors={errors} />
              <div className={styles.navRow}>
                <span />
                <button type="button" className="btnPrimary" onClick={goNext}>
                  Continue
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <StepWhatMoving form={form} onChange={updateForm} errors={errors} />
              <div className={styles.navRow}>
                <button type="button" className="btnGhostLight" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="btnPrimary" onClick={goNext}>
                  Get price
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <StepReviewBook key="review" form={form} onChange={updateForm} onBack={goBack} />
          )}
        </div>
      </div>
    </div>
  );
}
