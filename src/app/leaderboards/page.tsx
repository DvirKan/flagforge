import type { Metadata } from "next";
import Link from "next/link";
import { DailyLeaderboard } from "@/components/daily/DailyLeaderboard";
import { PeriodLeaderboard } from "@/components/leaderboards/PeriodLeaderboard";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { isCurrentPeriod, periodRange, shiftPeriod } from "@/lib/time/periods";
import { addCalendarDays, parseCalendarDate } from "@/lib/time/zoned";
import { getDailyLeaderboard, todayChallengeDate } from "@/server/daily/queries";
import { getPeriodLeaderboard } from "@/server/progress/queries";

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
  const viewerPromise = getViewer();
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => {
    const { year, month, day } = parseCalendarDate(d);
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(year, month - 1, day)));
  };
  const dateLabel = fmt(date, { dateStyle: "long" });
  const range = period === "daily" ? null : periodRange(period, date);
  const [dailyRows, periodRows, viewer] = await Promise.all([
    period === "daily" ? getDailyLeaderboard(date, 100) : Promise.resolve([]),
    range ? getPeriodLeaderboard(range.from, range.to, 100) : Promise.resolve([]),
    viewerPromise,
  ]);
  const prev = range ? shiftPeriod(range, -1) : null;
  const next = range ? shiftPeriod(range, 1) : null;
  const rangeLabel = range
    ? period === "monthly"
      ? fmt(range.from, { month: "long", year: "numeric" })
      : `${fmt(range.from, { day: "numeric", month: "short" })} – ${fmt(range.to, { day: "numeric", month: "short", year: "numeric" })}`
    : "";

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

      {period === "daily" ? (
        <>
          <div className="mt-6 flex items-center justify-between gap-4">
            <Link href={`/leaderboards?date=${addCalendarDays(date, -1)}`} className="text-sm link-underline">
              {t("leaderboards.prevDay")}
            </Link>
            <p className="display text-center text-lg md:text-xl">{dateLabel}</p>
            {date < today ? (
              <Link href={`/leaderboards?date=${addCalendarDays(date, 1)}`} className="text-sm link-underline">
                {t("leaderboards.nextDay")}
              </Link>
            ) : (
              <span aria-hidden="true" className="w-16" />
            )}
          </div>
          <div className="mt-4">
            <DailyLeaderboard rows={dailyRows} highlight={viewer?.username} emptyText={t("leaderboards.empty")} />
          </div>
        </>
      ) : range && prev && next ? (
        <>
          <div className="mt-6 flex items-center justify-between gap-4">
            <Link href={`/leaderboards?period=${period}&date=${prev.from}`} className="text-sm link-underline">
              {t(period === "weekly" ? "leaderboards.prevWeek" : "leaderboards.prevMonth")}
            </Link>
            <p className="display text-center text-lg md:text-xl">{rangeLabel}</p>
            {next.from <= today ? (
              <Link href={`/leaderboards?period=${period}&date=${next.from}`} className="text-sm link-underline">
                {t(period === "weekly" ? "leaderboards.nextWeek" : "leaderboards.nextMonth")}
              </Link>
            ) : (
              <span aria-hidden="true" className="w-16" />
            )}
          </div>
          {isCurrentPeriod(range, today) ? <p className="mt-2 text-center text-sm text-muted">{t("leaderboards.inProgress")}</p> : null}
          <div className="mt-4">
            <PeriodLeaderboard rows={periodRows} highlight={viewer?.username} emptyText={t("leaderboards.empty")} />
          </div>
        </>
      ) : null}
    </Container>
  );
}
