"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/auth/form-state";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

export function Field({
  name,
  label,
  type = "text",
  autoComplete,
  hint,
  state,
  defaultValue,
  required = true,
  dir,
  maxLength,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  state: FormState;
  defaultValue?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  maxLength?: number;
}) {
  const { t } = useI18n();
  const error = state.fields?.[name];
  const hintId = hint && !error ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        dir={dir}
        defaultValue={defaultValue ?? state.values?.[name] ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={["field-input", error ? "!border-danger" : ""].join(" ")}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {t(error)}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "accent" | "danger" }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  const cls = variant === "danger" ? "btn border-danger bg-danger text-paper" : variant === "accent" ? "btn btn-accent" : "btn btn-primary";
  return (
    <button type="submit" className={`${cls} w-full sm:w-auto`} disabled={pending} aria-busy={pending}>
      {pending ? t("auth.submitting") : label}
    </button>
  );
}

export function FormAlert({ message, tone = "error", vars }: { message?: MessageKey; tone?: "error" | "success" | "info"; vars?: Record<string, string> }) {
  const { t } = useI18n();
  if (!message) return null;
  const border = tone === "error" ? "border-danger" : tone === "success" ? "border-success" : "border-rust";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`border-s-2 ${border} bg-parchment px-3 py-2 text-sm`}>
      {t(message, vars)}
    </p>
  );
}
