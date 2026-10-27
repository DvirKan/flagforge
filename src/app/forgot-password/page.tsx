import type { Metadata } from "next";
import { AuthFooterLink, AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/NotConfigured";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.forgotTitle") };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t("auth.forgotTitle")} footer={<AuthFooterLink href="/login" label={t("auth.backToLogin")} />}>
      {isSupabaseConfigured() ? <ForgotForm /> : <NotConfigured />}
    </AuthShell>
  );
}
