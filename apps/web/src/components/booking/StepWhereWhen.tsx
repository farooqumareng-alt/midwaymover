import styles from "./BookingFlow.module.css";
import type { AddressFormState, BookingFormState } from "./types.ts";

interface Props {
  form: BookingFormState;
  onChange: (patch: Partial<BookingFormState>) => void;
  errors: Record<string, string>;
}

function AddressFields({
  legend,
  value,
  onChange,
  prefix,
  errors,
}: {
  legend: string;
  value: AddressFormState;
  onChange: (value: AddressFormState) => void;
  prefix: string;
  errors: Record<string, string>;
}) {
  const update = (patch: Partial<AddressFormState>) => onChange({ ...value, ...patch });

  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
      <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
        {legend}
      </legend>
      <div className="fieldGrid">
        <div className="field fieldGridFull">
          <label className="label" htmlFor={`${prefix}-line1`}>
            Street address
          </label>
          <input
            id={`${prefix}-line1`}
            className={`input${errors[`${prefix}.line1`] ? " hasError" : ""}`}
            value={value.line1}
            onChange={(e) => update({ line1: e.target.value })}
            autoComplete="address-line1"
          />
          {errors[`${prefix}.line1`] && (
            <span className="errorText">{errors[`${prefix}.line1`]}</span>
          )}
        </div>
        <div className="field fieldGridFull">
          <label className="label" htmlFor={`${prefix}-line2`}>
            Apt / suite / unit (optional)
          </label>
          <input
            id={`${prefix}-line2`}
            className="input"
            value={value.line2}
            onChange={(e) => update({ line2: e.target.value })}
            autoComplete="address-line2"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${prefix}-city`}>
            City
          </label>
          <input
            id={`${prefix}-city`}
            className={`input${errors[`${prefix}.city`] ? " hasError" : ""}`}
            value={value.city}
            onChange={(e) => update({ city: e.target.value })}
            autoComplete="address-level2"
          />
          {errors[`${prefix}.city`] && (
            <span className="errorText">{errors[`${prefix}.city`]}</span>
          )}
        </div>
        <div className="field">
          <label className="label" htmlFor={`${prefix}-state`}>
            State
          </label>
          <input
            id={`${prefix}-state`}
            className={`input${errors[`${prefix}.state`] ? " hasError" : ""}`}
            value={value.state}
            onChange={(e) => update({ state: e.target.value.toUpperCase() })}
            maxLength={2}
            placeholder="e.g. NY"
            autoComplete="address-level1"
          />
          {errors[`${prefix}.state`] && (
            <span className="errorText">{errors[`${prefix}.state`]}</span>
          )}
        </div>
        <div className="field">
          <label className="label" htmlFor={`${prefix}-postalCode`}>
            ZIP code
          </label>
          <input
            id={`${prefix}-postalCode`}
            className={`input${errors[`${prefix}.postalCode`] ? " hasError" : ""}`}
            value={value.postalCode}
            onChange={(e) => update({ postalCode: e.target.value })}
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
          />
          {errors[`${prefix}.postalCode`] && (
            <span className="errorText">{errors[`${prefix}.postalCode`]}</span>
          )}
        </div>
      </div>
    </fieldset>
  );
}

export function StepWhereWhen({ form, onChange, errors }: Props) {
  return (
    <div className={styles.stepBody}>
      <AddressFields
        legend="Pickup"
        value={form.pickup}
        onChange={(pickup) => onChange({ pickup })}
        prefix="pickup"
        errors={errors}
      />
      <AddressFields
        legend="Delivery"
        value={form.delivery}
        onChange={(delivery) => onChange({ delivery })}
        prefix="delivery"
        errors={errors}
      />
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className={styles.sectionTitle} style={{ marginBottom: 16 }}>
          When
        </legend>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className={form.scheduleNow ? "btnPrimary" : "btnGhostLight"}
            onClick={() => onChange({ scheduleNow: true })}
          >
            Now
          </button>
          <button
            type="button"
            className={!form.scheduleNow ? "btnPrimary" : "btnGhostLight"}
            onClick={() => onChange({ scheduleNow: false })}
          >
            Schedule
          </button>
        </div>
        {!form.scheduleNow && (
          <div className="field" style={{ marginTop: 16, maxWidth: 320 }}>
            <label className="label" htmlFor="scheduledFor">
              Pickup date &amp; time
            </label>
            <input
              id="scheduledFor"
              type="datetime-local"
              className={`input${errors.scheduledFor ? " hasError" : ""}`}
              value={form.scheduledFor}
              onChange={(e) => onChange({ scheduledFor: e.target.value })}
            />
            {errors.scheduledFor && <span className="errorText">{errors.scheduledFor}</span>}
          </div>
        )}
      </fieldset>
    </div>
  );
}
