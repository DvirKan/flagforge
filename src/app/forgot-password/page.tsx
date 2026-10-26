import type { Metadata } from "next";
import { AuthFooterLink, AuthShell } from "@/components/auth/AuthShell";
import { DisabledField } from "@/components/auth/DisabledField";
import { PreviewNotice } from "@/components/auth/PreviewNotice";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.forgotTitle") };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t("auth.forgotTitle")}
      footer={<AuthFooterLink href="/login" label={t("auth.backToLogin")} />}
    >
      <PreviewNotice text={t("auth.notYetEnabled")} />
      <form>
        <fieldset disabled className="grid gap-5">
        <DisabledField id="email" label={t("auth.email")} type="email" autoComplete="email" />
        <button type="submit" className="btn btn-primary" disabled>
          {t("auth.submitForgot")}
        </button>
        </fieldset>
      </form>
    </AuthShell>
  );
}
