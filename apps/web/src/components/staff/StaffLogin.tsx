"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./StaffLogin.module.css";

type Step = "credentials" | "mfaCode" | "mfaSetup" | "mfaSetupConfirm";

function extractSecret(enrollmentUri: string): string {
  try {
    return new URL(enrollmentUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function StaffLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [enrollmentUri, setEnrollmentUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson("/api/auth/staff-login", { email, password });
      if (!ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      if (data.status === "success") {
        router.push("/dispatch");
        return;
      }
      if (data.status === "mfaCodeRequired") {
        setStep("mfaCode");
        return;
      }
      if (data.status === "mfaSetupRequired") {
        const enroll = await postJson("/api/auth/mfa/enroll", { email, password });
        if (!enroll.ok) {
          setError(enroll.data.error ?? "Could not begin MFA setup.");
          return;
        }
        setEnrollmentUri(enroll.data.enrollmentUri);
        setStep("mfaSetup");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson("/api/auth/staff-login", {
        email,
        password,
        totpCode,
      });
      if (!ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      if (data.status === "success") {
        router.push("/dispatch");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSetupConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson("/api/auth/mfa/confirm", {
        email,
        password,
        totpCode,
      });
      if (!ok) {
        setError(data.error ?? "Could not confirm MFA setup.");
        return;
      }
      setStep("mfaCode");
      setTotpCode("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Staff Sign In</h1>
          <p className={styles.subtitle}>Midway Mover dispatch &amp; admin</p>
        </div>

        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="field" style={{ gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="errorText">{error}</p>}
            <button type="submit" className="btnPrimary" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        {step === "mfaCode" && (
          <form onSubmit={handleMfaCodeSubmit} className="field" style={{ gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="totpCode">
                6-digit authenticator code
              </label>
              <input
                id="totpCode"
                className="input"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <p className="errorText">{error}</p>}
            <button type="submit" className="btnPrimary" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        {step === "mfaSetup" && enrollmentUri && (
          <div className="field" style={{ gap: 16 }}>
            <p style={{ fontSize: 14, color: "var(--muted-on-light)" }}>
              This account requires two-factor authentication. Add this key to
              an authenticator app (Google Authenticator, Authy, 1Password, …):
            </p>
            <div className={styles.secretBox}>{extractSecret(enrollmentUri)}</div>
            <button
              type="button"
              className="btnPrimary"
              onClick={() => setStep("mfaSetupConfirm")}
            >
              I&rsquo;ve added it
            </button>
          </div>
        )}

        {step === "mfaSetupConfirm" && (
          <form onSubmit={handleMfaSetupConfirm} className="field" style={{ gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="setupTotpCode">
                Enter the 6-digit code from your authenticator app
              </label>
              <input
                id="setupTotpCode"
                className="input"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <p className="errorText">{error}</p>}
            <button type="submit" className="btnPrimary" disabled={submitting}>
              {submitting ? "Confirming…" : "Confirm & Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
