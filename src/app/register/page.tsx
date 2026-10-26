import type { Metadata } from "next";
import { AuthFooterLink, AuthShell } from "@/components/auth/AuthShell";
import { DisabledField } from "@/components/auth/DisabledField";
import { PreviewNotice } from "@/components/auth/PreviewNotice";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.registerTitle") };
}

export default async function RegisterPage() {
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t("auth.registerTitle")}
      footer={<AuthFooterLink prompt={t("auth.haveAccount")} href="/login" label={t("nav.signIn")} />}
    >
      <PreviewNotice text={t("auth.notYetEnabled")} />
      <form>
        <fieldset disabled className="grid gap-5">
        <DisabledField id="username" label={t("auth.username")} autoComplete="username" />
        <DisabledField id="email" label={t("auth.email")} type="email" autoComplete="email" />
        <DisabledField id="password" label={t("auth.password")} type="password" autoComplete="new-password" />
        <button type="submit" className="btn btn-primary" disabled>
          {t("auth.submitRegister")}
        </button>
        </fieldset>
      </form>
    </AuthShell>
  );
}
