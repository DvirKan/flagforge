import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFooterLink, AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/NotConfigured";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.registerTitle") };
}

export default async function RegisterPage() {
  if (await getViewer()) redirect("/profile");
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t("auth.registerTitle")}
      footer={<AuthFooterLink prompt={t("auth.haveAccount")} href="/login" label={t("nav.signIn")} />}
    >
      <p className="mb-6 text-ink-soft">{t("auth.guestBenefits")}</p>
      {isSupabaseConfigured() ? <RegisterForm /> : <NotConfigured />}
    </AuthShell>
  );
}
