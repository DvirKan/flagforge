import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/NotConfigured";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.resetTitle") };
}

/** Reached from the recovery email via /auth/confirm, which establishes a short-lived session. */
export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  const viewer = isSupabaseConfigured() ? await getViewer() : null;
  return (
    <AuthShell title={t("auth.resetTitle")}>
      {!isSupabaseConfigured() ? (
        <NotConfigured />
      ) : viewer ? (
        <ResetForm />
      ) : (
        <div className="grid gap-4">
          <p className="text-ink-soft">{t("auth.resetNeedsLink")}</p>
          <Link href="/forgot-password" className="justify-self-start text-sm link-underline">
            {t("auth.requestNewLink")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
