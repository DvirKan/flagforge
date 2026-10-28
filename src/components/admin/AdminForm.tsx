"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { AdminActionState } from "@/lib/admin/actions";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

type Action = (prev: AdminActionState, form: FormData) => Promise<AdminActionState>;

/**
 * A small form bound to an admin server action: hidden fields, optional extra inputs, a submit button and
 * the outcome. `confirm` makes the button two-step (first click arms it), for irreversible operations.
 */
export function AdminForm({
  action,
  fields,
  label,
  variant = "ghost",
  confirm = false,
  children,
  className,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  variant?: "primary" | "ghost" | "accent" | "danger";
  confirm?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as AdminActionState);
  const [armed, setArmed] = useState(false);

  const btn =
    variant === "danger"
      ? "btn border-danger text-danger hover:bg-danger-wash"
      : variant === "primary"
        ? "btn btn-primary"
        : variant === "accent"
          ? "btn btn-accent"
          : "btn btn-ghost";

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !armed) {
          e.preventDefault();
          setArmed(true);
        } else setArmed(false);
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button type="submit" className={btn} disabled={pending}>
          {pending ? t("auth.submitting") : armed ? t("admin.confirm") : label}
        </button>
      </div>
      {state.status === "ok" ? (
        <p role="status" className="mt-2 text-sm text-success">
          {state.report ? t("admin.fillDone", state.report) : t("admin.ok")}
        </p>
      ) : null}
      {state.status === "error" ? (
        <div role="alert" className="mt-2 text-sm text-danger">
          <p>{t(state.error === "past" ? "admin.errPast" : state.error === "generic" ? "admin.errGeneric" : (`admin.err${state.error[0]?.toUpperCase()}${state.error.slice(1)}` as MessageKey))}</p>
          {state.problems?.length ? (
            <ul className="mt-1 list-disc ps-5">
              {state.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
