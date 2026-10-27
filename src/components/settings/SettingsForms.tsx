"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/auth/fields";
import { updateProfileAction } from "@/lib/auth/account-actions";
import { deleteAccountAction, resetPasswordAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

export function ProfileForm({ username, displayName }: { username: string; displayName: string | null }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state.message} tone={state.status === "success" ? "success" : "error"} />
      <Field name="username" label={t("auth.username")} hint={t("auth.usernameHint")} state={state} defaultValue={state.values?.username ?? username} dir="auto" maxLength={20} />
      <Field name="displayName" label={t("settings.displayName")} hint={t("settings.displayNameHint")} state={state} defaultValue={state.values?.displayName ?? displayName ?? ""} required={false} maxLength={40} />
      <SubmitButton label={t("settings.save")} />
    </form>
  );
}

export function LanguageForm() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <fieldset disabled={pending}>
      <legend className="sr-only">{t("settings.languageSection")}</legend>
      <div className="flex gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={l === locale}
            onClick={() =>
              start(async () => {
                if ((await setLocaleAction(l)).ok) router.refresh();
              })
            }
            className={["btn", l === locale ? "btn-primary" : "btn-ghost"].join(" ")}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t("settings.languageHint")}</p>
    </fieldset>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state.message} />
      <Field name="password" type="password" autoComplete="new-password" label={t("auth.newPassword")} hint={t("auth.passwordHint")} state={state} dir="ltr" defaultValue="" maxLength={72} />
      <SubmitButton label={t("auth.submitReset")} />
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(deleteAccountAction, initialFormState);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state.message} />
      <Field name="confirm" label={t("settings.deleteConfirmLabel", { username })} state={state} defaultValue="" dir="ltr" autoComplete="off" />
      <SubmitButton label={t("settings.deleteButton")} variant="danger" />
    </form>
  );
}
