"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BACKGROUNDS,
  JURISDICTIONS,
  PURPOSES,
} from "@/lib/signal/jurisdictions";
import {
  loadOperatorProfile,
  saveOperatorProfile,
} from "@/lib/signal/operator-profile";

interface FormState {
  nationality: string;
  background: string;
  currently_based_in: string;
  purpose: string;
  target_jurisdiction: string;
}

const FIELD_NAMES: ReadonlyArray<keyof FormState> = [
  "nationality",
  "background",
  "currently_based_in",
  "purpose",
  "target_jurisdiction",
];

const EMPTY: FormState = {
  nationality: "",
  background: "",
  currently_based_in: "",
  purpose: "",
  target_jurisdiction: "",
};

export function OperatorOnboarding() {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const existing = loadOperatorProfile();
    if (existing) {
      setForm({
        nationality: existing.nationality,
        background: existing.background,
        currently_based_in: existing.currently_based_in,
        purpose: existing.purpose,
        target_jurisdiction: existing.target_jurisdiction,
      });
    }
  }, []);

  // Auto-clear validation error the moment any field becomes non-empty.
  // Watch every form field so password-managers / programmatic fillers
  // don't leave the error stuck on screen.
  React.useEffect(() => {
    if (!error) return;
    const allFilled = FIELD_NAMES.every((k) => form[k].trim().length > 0);
    if (allFilled) setError(null);
  }, [error, form]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    // Native fallback: read the actual <select> values straight off the
    // submitted form. This catches the case where a programmatic value
    // change (DevTools / password manager / e2e harness) didn't dispatch
    // a React-tracked change event, leaving local state stale.
    const formData = new FormData(event.currentTarget);
    const values: FormState = {
      nationality: String(formData.get("nationality") ?? "").trim(),
      background: String(formData.get("background") ?? "").trim(),
      currently_based_in: String(
        formData.get("currently_based_in") ?? "",
      ).trim(),
      purpose: String(formData.get("purpose") ?? "").trim(),
      target_jurisdiction: String(
        formData.get("target_jurisdiction") ?? "",
      ).trim(),
    };

    if (
      !values.nationality ||
      !values.background ||
      !values.currently_based_in ||
      !values.purpose ||
      !values.target_jurisdiction
    ) {
      // Sync state so the inputs reflect the values we observed.
      setForm(values);
      setError("All five fields are required.");
      return;
    }
    setForm(values);
    setError(null);
    setSubmitting(true);

    saveOperatorProfile(values);
    // Route to /signal; the landing page auto-creates a new session seeded
    // with this profile + the welcome line, then forwards to /signal/[id].
    router.push("/signal");
  };

  return (
    <div className="container py-24 md:py-32 mx-auto md:max-w-[78%]">
      <div className="max-w-xl space-y-6">
        <p className="text-kicker uppercase text-ink-faint">SIGNAL · Onboarding</p>
        <hr className="max-w-[3rem] border-t border-line" aria-hidden />
        <h1 className="font-bold tracking-tight text-ink leading-[1.1] text-[2.5rem] md:text-[3rem] lg:text-[3.5rem]">
          Tell us about yourself.
        </h1>
        <p className="text-lead text-ink-muted leading-relaxed max-w-md pt-2">
          Five questions before qualification begins. SIGNAL uses these to
          tailor follow-ups instead of starting from zero.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-16 max-w-xl space-y-10" noValidate>
        <Field
          name="nationality"
          label="Nationality"
          value={form.nationality}
          onChange={(v) => setField("nationality", v)}
          options={JURISDICTIONS}
          placeholder="Select"
        />
        <Field
          name="background"
          label="Background"
          value={form.background}
          onChange={(v) => setField("background", v)}
          options={BACKGROUNDS}
          placeholder="Select"
        />
        <Field
          name="currently_based_in"
          label="Currently based in"
          value={form.currently_based_in}
          onChange={(v) => setField("currently_based_in", v)}
          options={JURISDICTIONS}
          placeholder="Select"
        />
        <Field
          name="purpose"
          label="Purpose of move"
          value={form.purpose}
          onChange={(v) => setField("purpose", v)}
          options={PURPOSES}
          placeholder="Select"
        />
        <Field
          name="target_jurisdiction"
          label="Target jurisdiction"
          value={form.target_jurisdiction}
          onChange={(v) => setField("target_jurisdiction", v)}
          options={JURISDICTIONS}
          placeholder="Select"
        />

        {error && (
          <p className="text-sm text-band-low-fg" role="alert">
            {error}
          </p>
        )}

        <div className="pt-4">
          <button type="submit" disabled={submitting} className="pill-engage">
            {submitting ? "BEGINNING…" : "BEGIN QUALIFICATION"}
          </button>
        </div>

        <p className="text-2xs text-ink-muted leading-relaxed max-w-md pt-4">
          Your responses are sent to glomotec's qualification engine. We do not
          retain identifying information without consent.
        </p>
      </form>
    </div>
  );
}

interface FieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}

function Field({ name, label, value, onChange, options, placeholder }: FieldProps) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-kicker uppercase text-ink-faint">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // input event fires on programmatic changes from password managers
        // and accessibility tooling that bypass React's synthetic event.
        onInput={(e) => onChange((e.target as HTMLSelectElement).value)}
        required
        className="w-full appearance-none rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors hover:border-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        <option value="" disabled>
          {placeholder ?? "Select"}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
