import type { Metadata } from "next";
import Link from "next/link";
import { DailyLeaderboard } from "@/components/daily/DailyLeaderboard";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { addCalendarDays, parseCalendarDate } from "@/lib/time/zoned";
import { getDailyLeaderboard, todayChallengeDate } from "@/server/daily/queries";

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("leaderboards.title") };
}

function validDate(raw: string | undefined, today: string): string {
  if (!raw) return today;
  try {
    parseCalendarDate(raw);
  } catch {
    return today;
  }
  return raw > today ? today : raw; // future boards are always empty; clamp to today
}

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ period?: string; date?: string }> }) {
  const { period: raw, date: rawDate } = await searchParams;
  const period: Period = PERIODS.find((p) => p === raw) ?? "daily";
  const { locale, t } = await getI18n();
  const today = todayChallengeDate();
  const date = validDate(rawDate, today);
  const [rows, viewer] = period === "daily" ? await Promise.all([getDailyLeaderboard(date, 100), getViewer()]) : [[], null];
  const { year, month, day } = parseCalendarDate(date);
  const dateLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "UTC", dateStyle: "full" }).format(new Date(Date.UTC(year, month - 1, day)));

  return (
    <Container>
      <PageHeader title={t("leaderboards.title")} />
      <nav aria-label={t("leaderboards.title")} className="mt-8">
        <ul className="flex gap-1 border-b border-rule">
          {PERIODS.map((p) => (
            <li key={p}>
              <Link
                href={p === "daily" ? "/leaderboards" : `/leaderboards?period=${p}`}
                aria-current={p === period ? "page" : undefined}
                className={[
                  "-mb-px inline-block border-b-2 px-4 py-3 text-[0.9375rem]",
                  p === period ? "border-rust font-medium text-ink" : "border-transparent text-muted hover:text-ink",
                ].join(" ")}
              >
                {t(`leaderboards.${p}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-6 text-sm text-muted">{period === "daily" ? t("leaderboards.dailyRule") : t("leaderboards.periodRule")}</p>

      {period === "daily" ? (
        <>
          <div className="mt-6 flex items-center justify-between gap-4">
            <Link href={`/leaderboards?date=${addCalendarDays(date, -1)}`} className="text-sm link-underline">
              {t("leaderboards.prevDay")}
            </Link>
            <p className="display text-xl">{dateLabel}</p>
            {date < today ? (
              <Link href={`/leaderboards?date=${addCalendarDays(date, 1)}`} className="text-sm link-underline">
                {t("leaderboards.nextDay")}
              </Link>
            ) : (
              <span aria-hidden="true" className="w-16" />
            )}
          </div>
          <div className="mt-4">
            <DailyLeaderboard rows={rows} highlight={viewer?.username} emptyText={t("leaderboards.empty")} />
          </div>
        </>
      ) : (
        <>
          <div className="mt-8 border-y border-ink py-12 text-center">
            <p className="display text-2xl">{t("leaderboards.empty")}</p>
          </div>
          <ConstructionNotice phase={5} />
        </>
      )}
    </Container>
  );
}
