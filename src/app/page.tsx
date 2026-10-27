import Link from "next/link";
import { Countdown } from "@/components/daily/Countdown";
import { DailyLeaderboard } from "@/components/daily/DailyLeaderboard";
import { Container } from "@/components/ui/Container";
import { gameConfig } from "@/config/game";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { nextDayBoundary } from "@/lib/time/zoned";
import { getDailyLeaderboard, getPublishedChallenge, todayChallengeDate } from "@/server/daily/queries";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const { t } = await getI18n();
  const now = new Date();
  const today = todayChallengeDate(now);
  const [viewer, challenge, board] = await Promise.all([getViewer(), getPublishedChallenge(today), getDailyLeaderboard(today, 5)]);

  return (
    <>
      {account === "deleted" ? (
        <p role="status" className="bg-paper px-4 py-3 text-center text-sm">
          {t("settings.deleted")}
        </p>
      ) : null}

      <Container className="grid gap-10 pb-12 pt-12 md:pt-20 lg:grid-cols-12 lg:items-center lg:gap-16">
        <section className="lg:col-span-7">
          <h1 className="display text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl">{t("home.title")}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">{t("home.lede")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/play" className="btn btn-primary">
              {t("home.ctaPlay")}
            </Link>
            {viewer ? (
              <Link href="/profile" className="btn btn-ghost">
                {t("nav.profile")}
              </Link>
            ) : (
              <Link href="/register" className="btn btn-ghost">
                {t("nav.register")}
              </Link>
            )}
          </div>
        </section>

        <aside aria-labelledby="daily-card-title" className="rounded-sm bg-paper p-6 shadow-[0_1px_0_var(--color-rule)] lg:col-span-5 md:p-8">
          <h2 id="daily-card-title" className="display text-2xl">
            {t("daily.title")}
          </h2>
          <p className="mt-2 text-ink-soft">{t("home.dailyRules")}</p>
          {challenge ? (
            <Link href="/daily" className="btn btn-accent mt-5 w-full sm:w-auto">
              {t("daily.start")}
            </Link>
          ) : (
            <p className="mt-5 text-sm text-muted">{t("home.dailyNone")}</p>
          )}
          <div className="mt-6 border-t border-rule pt-5">
            <Countdown targetIso={nextDayBoundary(now, gameConfig.daily.timezone).toISOString()} serverNowIso={now.toISOString()} />
          </div>
        </aside>
      </Container>

      <Container className="pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="display text-2xl">{t("home.leaderboardTitle")}</h2>
          <Link href="/leaderboards" className="text-sm link-underline">
            {t("nav.leaderboards")}
          </Link>
        </div>
        <div className="mt-4">
          <DailyLeaderboard rows={board} highlight={viewer?.username} emptyText={t("home.leaderboardEmpty")} />
        </div>
      </Container>
    </>
  );
}
