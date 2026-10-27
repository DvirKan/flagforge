import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFooterLink, AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/NotConfigured";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/validation/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.loginTitle") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext);
  if (await getViewer()) redirect(next);
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t("auth.loginTitle")}
      footer={<AuthFooterLink prompt={t("auth.noAccount")} href="/register" label={t("nav.register")} />}
    >
      {isSupabaseConfigured() ? <LoginForm next={next} initialError={error === "link_invalid" ? "link_invalid" : undefined} /> : <NotConfigured />}
    </AuthShell>
  );
}
