"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resendConfirmationAction, resetPasswordAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { useI18n } from "@/lib/i18n/client";
import { Field, FormAlert, SubmitButton } from "./fields";

export function LoginForm({ next, initialError }: { next: string; initialError?: "link_invalid" }) {
  const { t } = useI18n();
  const [state, action] = useActionState(loginAction, initialFormState);
  return (
    <>
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {initialError && state.status === "idle" ? <FormAlert message="auth.linkInvalid" /> : null}
      <FormAlert message={state.message} />
      <Field name="email" type="email" autoComplete="email" label={t("auth.email")} state={state} dir="ltr" maxLength={254} />
      <Field name="password" type="password" autoComplete="current-password" label={t("auth.password")} state={state} dir="ltr" defaultValue="" maxLength={72} />
      <Link href="/forgot-password" className="justify-self-start text-sm link-underline">
        {t("auth.forgotLink")}
      </Link>
      <SubmitButton label={t("auth.submitLogin")} />
    </form>
    {state.message === "authErrors.emailNotConfirmed" ? <ResendForm email={state.values?.email ?? ""} /> : null}
    </>
  );
}

function ResendForm({ email }: { email: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(resendConfirmationAction, initialFormState);
  return (
    <form action={action} className="mt-5 border-t border-rule pt-4">
      <input type="hidden" name="email" value={email} />
      {state.status === "success" ? (
        <FormAlert tone="success" message={state.message} />
      ) : (
        <>
          <FormAlert message={state.message} />
          <button type="submit" className="text-sm link-underline">
            {t("auth.resendConfirmation")}
          </button>
        </>
      )}
    </form>
  );
}

export function RegisterForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(registerAction, initialFormState);
  if (state.status === "success") {
    return (
      <div role="status" className="grid gap-4">
        <h2 className="display text-2xl">{t("auth.checkEmailTitle")}</h2>
        <p className="text-ink-soft">{t("auth.checkEmailBody", { email: state.values?.email ?? "" })}</p>
        <ResendForm email={state.values?.email ?? ""} />
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state.message} />
      <Field name="username" autoComplete="username" label={t("auth.username")} hint={t("auth.usernameHint")} state={state} dir="auto" maxLength={20} />
      <Field name="email" type="email" autoComplete="email" label={t("auth.email")} state={state} dir="ltr" maxLength={254} />
      <Field name="password" type="password" autoComplete="new-password" label={t("auth.password")} hint={t("auth.passwordHint")} state={state} dir="ltr" defaultValue="" maxLength={72} />
      <SubmitButton label={t("auth.submitRegister")} />
    </form>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(forgotPasswordAction, initialFormState);
  if (state.status === "success") {
    return <FormAlert tone="success" message="auth.resetSent" vars={{ email: state.values?.email ?? "" }} />;
  }
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state.message} />
      <Field name="email" type="email" autoComplete="email" label={t("auth.email")} state={state} dir="ltr" maxLength={254} />
      <SubmitButton label={t("auth.submitForgot")} />
    </form>
  );
}

export function ResetForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert message={state.message} />
      <Field name="password" type="password" autoComplete="new-password" label={t("auth.newPassword")} hint={t("auth.passwordHint")} state={state} dir="ltr" defaultValue="" maxLength={72} />
      <SubmitButton label={t("auth.submitReset")} />
      {state.message === "authErrors.sessionMissing" ? (
        <Link href="/forgot-password" className="text-sm link-underline">
          {t("auth.requestNewLink")}
        </Link>
      ) : null}
    </form>
  );
}
