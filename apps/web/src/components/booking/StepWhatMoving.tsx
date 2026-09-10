import styles from "./BookingFlow.module.css";
import type { BookingFormState, CargoType } from "./types.ts";

interface Props {
  form: BookingFormState;
  onChange: (patch: Partial<BookingFormState>) => void;
  errors: Record<string, string>;
}

const CARGO_OPTIONS: { value: CargoType; label: string }[] = [
  { value: "BOXES_PACKAGES", label: "Boxes / Packages" },
  { value: "PALLETS", label: "Pallets" },
  { value: "EQUIPMENT_MACHINERY", label: "Equipment / Machinery" },
  { value: "OTHER", label: "Other" },
];

export function StepWhatMoving({ form, onChange, errors }: Props) {
  return (
    <div className={styles.stepBody}>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
          What are you moving?
        </legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {CARGO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="optionCard"
              aria-pressed={form.cargoType === opt.value}
              onClick={() =>
                onChange({
                  cargoType: opt.value,
                  palletCount: opt.value === "PALLETS" ? (form.palletCount ?? 1) : null,
                })
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.cargoType && <span className="errorText">{errors.cargoType}</span>}
      </fieldset>

      {form.cargoType === "PALLETS" && (
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
            Number of pallets
          </legend>
          <div style={{ display: "flex", gap: 12 }}>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className="optionCard"
                style={{ minHeight: 56, minWidth: 56, flex: "0 0 auto" }}
                aria-pressed={form.palletCount === n}
                onClick={() => onChange({ palletCount: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
          Approximate weight and size
        </legend>
        <div className="fieldGrid">
          <div className="field">
            <label className="label" htmlFor="approxWeightKg">
              Approximate weight (kg)
            </label>
            <input
              id="approxWeightKg"
              className={`input${errors.approxWeightKg ? " hasError" : ""}`}
              value={form.approxWeightKg}
              onChange={(e) => onChange({ approxWeightKg: e.target.value })}
              inputMode="decimal"
            />
            {errors.approxWeightKg && (
              <span className="errorText">{errors.approxWeightKg}</span>
            )}
          </div>
          <div />
          <div className="field">
            <label className="label" htmlFor="lengthCm">
              Length (cm, optional)
            </label>
            <input
              id="lengthCm"
              className="input"
              value={form.lengthCm}
              onChange={(e) => onChange({ lengthCm: e.target.value })}
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="widthCm">
              Width (cm, optional)
            </label>
            <input
              id="widthCm"
              className="input"
              value={form.widthCm}
              onChange={(e) => onChange({ widthCm: e.target.value })}
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="heightCm">
              Height (cm, optional)
            </label>
            <input
              id="heightCm"
              className="input"
              value={form.heightCm}
              onChange={(e) => onChange({ heightCm: e.target.value })}
              inputMode="decimal"
            />
          </div>
        </div>
      </fieldset>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
          Loading equipment — pickup
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.pickupForkliftAvailable}
              onChange={(e) => onChange({ pickupForkliftAvailable: e.target.checked })}
            />
            Forklift available
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.pickupDockAvailable}
              onChange={(e) => onChange({ pickupDockAvailable: e.target.checked })}
            />
            Loading dock available
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.pickupCustomerLoading}
              onChange={(e) => onChange({ pickupCustomerLoading: e.target.checked })}
            />
            I&rsquo;ll load it myself
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.pickupDriverAssistNeeded}
              onChange={(e) => onChange({ pickupDriverAssistNeeded: e.target.checked })}
            />
            I need driver assistance
          </label>
        </div>
      </fieldset>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
          Loading equipment — delivery
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.deliveryForkliftAvailable}
              onChange={(e) => onChange({ deliveryForkliftAvailable: e.target.checked })}
            />
            Forklift available
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.deliveryDockAvailable}
              onChange={(e) => onChange({ deliveryDockAvailable: e.target.checked })}
            />
            Loading dock available
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.deliveryReceiverUnloading}
              onChange={(e) => onChange({ deliveryReceiverUnloading: e.target.checked })}
            />
            Receiver will unload
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={form.deliveryDriverAssistNeeded}
              onChange={(e) => onChange({ deliveryDriverAssistNeeded: e.target.checked })}
            />
            Receiver needs driver assistance
          </label>
        </div>
      </fieldset>
    </div>
  );
}
