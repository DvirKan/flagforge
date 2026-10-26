import type { Metadata } from "next";
import Link from "next/link";
import { AuthFooterLink, AuthShell } from "@/components/auth/AuthShell";
import { DisabledField } from "@/components/auth/DisabledField";
import { PreviewNotice } from "@/components/auth/PreviewNotice";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.loginTitle") };
}

export default async function LoginPage() {
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t("auth.loginTitle")}
      footer={<AuthFooterLink prompt={t("auth.noAccount")} href="/register" label={t("nav.register")} />}
    >
      <PreviewNotice text={t("auth.notYetEnabled")} />
      <form>
        <fieldset disabled className="grid gap-5">
        <DisabledField id="email" label={t("auth.email")} type="email" autoComplete="email" />
        <DisabledField id="password" label={t("auth.password")} type="password" autoComplete="current-password" />
        <Link href="/forgot-password" className="justify-self-start text-sm link-underline">
          {t("auth.forgotLink")}
        </Link>
        <button type="submit" className="btn btn-primary" disabled>
          {t("auth.submitLogin")}
        </button>
        </fieldset>
      </form>
    </AuthShell>
  );
}
