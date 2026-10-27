import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyClient } from "@/components/daily/DailyClient";
import { Container } from "@/components/ui/Container";
import { requireViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { getPublishedChallenge, todayChallengeDate } from "@/server/daily/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("daily.title") };
}

/** The ranked attempt itself. Signed-in users only; without a published challenge today, back to /daily. */
export default async function DailyPlayPage() {
  await requireViewer("/daily/play");
  if (!isAdminClientConfigured() || !(await getPublishedChallenge(todayChallengeDate()))) redirect("/daily");
  const { t } = await getI18n();
  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2 pt-3 md:pb-4 md:pt-8">
        <h1 className="flex items-baseline gap-3">
          <span className="eyebrow">
            <span className="text-rust-ink">II</span>
            <span className="mx-2 text-rule-strong" aria-hidden="true">—</span>
            {t("daily.eyebrow")}
          </span>
          <span className="display text-xl md:text-3xl">{t("daily.title")}</span>
        </h1>
        <Link href="/daily" className="text-sm link-underline">
          {t("daily.rulesTitle")}
        </Link>
      </div>
      <div className="pt-3 md:pt-8">
        <DailyClient />
      </div>
    </Container>
  );
}
