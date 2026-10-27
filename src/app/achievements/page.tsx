import type { Metadata } from "next";
import Link from "next/link";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getAchievements } from "@/server/progress/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("achievements.title") };
}

export default async function AchievementsPage() {
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const list = await getAchievements(Boolean(viewer));
  const earned = list.filter((a) => a.earnedAt);
  const dateFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", year: "numeric" });
  // Earned first (most recent first), then locked in catalogue order.
  const ordered = [...earned.sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? "")), ...list.filter((a) => !a.earnedAt)];

  return (
    <Container>
      <PageHeader
        title={t("achievements.title")}
        lede={viewer ? t("achievements.progress", { count: earned.length, total: list.length }) : t("achievements.lede")}
      />
      {viewer && list.length > 0 ? (
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-parchment-deep" aria-hidden="true">
          <div className="h-full rounded-full bg-[#c48a12]" style={{ width: `${(100 * earned.length) / list.length}%` }} />
        </div>
      ) : null}
      {!viewer ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-paper px-5 py-4 shadow-card">
          <p className="text-ink-soft">{t("achievements.guestNote")}</p>
          <Link href="/login?next=/achievements" className="btn btn-primary">
            {t("nav.signIn")}
          </Link>
        </div>
      ) : null}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((a) => (
          <AchievementCard
            key={a.code}
            a={a}
            locale={locale}
            earnedLabel={a.earnedAt ? t("achievements.earnedOn", { date: dateFmt.format(new Date(a.earnedAt)) }) : null}
            lockedLabel={t("achievements.locked")}
          />
        ))}
      </ul>
    </Container>
  );
}
