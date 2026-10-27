import Link from "next/link";
import { Countdown } from "@/components/daily/Countdown";
import { DifficultyIndex } from "@/components/game/DifficultyIndex";
import { Container } from "@/components/ui/Container";
import { gameConfig } from "@/config/game";
import { getViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { nextDayBoundary } from "@/lib/time/zoned";
import { DailyLeaderboard } from "@/components/daily/DailyLeaderboard";
import { getDailyLeaderboard, getPublishedChallenge, todayChallengeDate } from "@/server/daily/queries";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const { locale, t } = await getI18n();
  const [viewer, challenge, board] = await Promise.all([getViewer(), getPublishedChallenge(todayChallengeDate()), getDailyLeaderboard(todayChallengeDate(), 5)]);
  const now = new Date();
  const tz = gameConfig.daily.timezone;
  const boundary = nextDayBoundary(now, tz);
  const todayLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(now);

  const pillars = [
    { mark: "I", title: t("home.pillarPlay"), body: t("home.pillarPlayBody") },
    { mark: "II", title: t("home.pillarCompete"), body: t("home.pillarCompeteBody") },
    { mark: "III", title: t("home.pillarProgress"), body: t("home.pillarProgressBody") },
  ];

  return (
    <>
      {account === "deleted" ? (
        <p role="status" className="border-b border-ink bg-paper px-4 py-3 text-center text-sm">
          {t("settings.deleted")}
        </p>
      ) : null}
      {/* Hero */}
      <section className="graticule border-b border-ink">
        <Container className="grid gap-10 py-12 md:py-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <h1 className="display mt-5 text-[3rem] leading-[0.98] sm:text-7xl lg:text-[5.75rem]">{t("home.title")}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft md:text-xl">{t("home.lede")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/play" className="btn btn-primary">
                {t("home.ctaPlay")}
              </Link>
              <Link href="/daily" className="btn btn-ghost">
                {t("home.ctaDaily")}
              </Link>
            </div>
          </div>

          {/* Daily plate */}
          <aside aria-labelledby="daily-plate-title" className="self-end border border-ink bg-paper lg:col-span-5">
            <div className="flex items-center justify-between border-b border-ink px-5 py-2.5">
              <p className="eyebrow text-rust-ink">{t("home.dailyEyebrow")}</p>
              <p className="eyebrow tabular">{todayLabel}</p>
            </div>
            <div className="px-5 py-6">
              <h2 id="daily-plate-title" className="display text-2xl md:text-3xl">
                {t("home.dailyTitle")}
              </h2>
              <p className="mt-3 text-ink-soft">{t("home.dailyRules")}</p>
              {challenge ? (
                <Link href="/daily" className="btn btn-accent mt-5">
                  {t("daily.start")}
                </Link>
              ) : (
                <p className="mt-5 border-s-2 border-rust ps-3 text-sm">{t("home.dailyNone")}</p>
              )}
              <div className="rule-tick mt-6 pt-5">
                <Countdown targetIso={boundary.toISOString()} serverNowIso={now.toISOString()} />
              </div>
            </div>
          </aside>
        </Container>
      </section>

      {/* Three pillars */}
      <section aria-label={t("home.pillarsLabel")} className="border-b border-ink">
        <Container>
          <ol className="grid md:grid-cols-3">
            {pillars.map((p, i) => (
              <li
                key={p.mark}
                className={[
                  "py-8 md:px-8 md:py-12",
                  i > 0 ? "border-t border-rule md:border-s md:border-t-0" : "md:ps-0",
                ].join(" ")}
              >
                <p className="font-display text-xl text-rust-ink" aria-hidden="true">
                  {p.mark}
                </p>
                <h2 className="display mt-2 text-3xl">{p.title}</h2>
                <p className="mt-3 max-w-sm text-ink-soft">{p.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Difficulty */}
      <section className="py-14 md:py-20">
        <Container className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="display text-4xl md:text-5xl">{t("home.difficultyTitle")}</h2>
            <p className="mt-4 max-w-sm text-sm text-muted">{t("difficulty.note")}</p>
          </div>
          <div className="lg:col-span-8">
            <DifficultyIndex />
          </div>
        </Container>
      </section>

      {/* Standings + personal record */}
      <section className="border-t border-ink">
        <Container className="grid md:grid-cols-2">
          <div className="py-10 md:pe-10">
            <h2 className="display text-3xl">{t("home.leaderboardTitle")}</h2>
            <div className="mt-6">
              <DailyLeaderboard rows={board} highlight={viewer?.username} emptyText={t("home.leaderboardEmpty")} />
            </div>
            <Link href="/leaderboards" className="mt-4 inline-block text-sm link-underline">
              {t("nav.leaderboards")}
            </Link>
          </div>
          <div className="border-t border-rule py-10 md:border-s md:border-t-0 md:ps-10">
            <h2 className="display text-3xl">{t("home.progressTitle")}</h2>
            {viewer ? (
              <>
                <p className="mt-6 border-t border-rule pt-6 text-ink-soft" dir="ltr">
                  @{viewer.username}
                </p>
                <Link href="/profile" className="btn btn-primary mt-6">
                  {t("nav.profile")}
                </Link>
              </>
            ) : (
              <>
                <p className="mt-6 border-t border-rule pt-6 text-ink-soft">{t("home.progressGuest")}</p>
                <Link href="/register" className="btn btn-accent mt-6">
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
