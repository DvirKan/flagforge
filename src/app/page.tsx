import Link from "next/link";
import { Countdown } from "@/components/daily/Countdown";
import { DailyLeaderboard } from "@/components/daily/DailyLeaderboard";
import { FlagFan } from "@/components/home/FlagFan";
import { Container } from "@/components/ui/Container";
import { gameConfig } from "@/config/game";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { nextDayBoundary } from "@/lib/time/zoned";
import { getDailyLeaderboard, getMyAttempt, getPublishedChallenge, todayChallengeDate } from "@/server/daily/queries";

const MYSTERY = ["easy", "easy", "medium", "medium", "hard"] as const;
const DOT = { easy: "bg-success", medium: "bg-[#e0a526]", hard: "bg-rust" } as const;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const { t } = await getI18n();
  const now = new Date();
  const today = todayChallengeDate(now);
  const [viewer, challenge, board] = await Promise.all([getViewer(), getPublishedChallenge(today), getDailyLeaderboard(today, 5)]);
  const attempt = viewer && challenge ? await getMyAttempt(challenge.id) : null;

  return (
    <>
      {account === "deleted" ? (
        <p role="status" className="bg-paper px-4 py-3 text-center text-sm">
          {t("settings.deleted")}
        </p>
      ) : null}

      <Container className="grid items-center gap-10 pb-10 pt-10 md:pt-16 lg:grid-cols-2 lg:gap-16">
        <section>
          {viewer ? <p className="mb-3 text-lg text-rust-ink">{t("home.welcomeBack", { name: viewer.displayName ?? viewer.username })}</p> : null}
          <h1 className="display text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.25rem]">{t("home.title")}</h1>
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
        <FlagFan />
      </Container>

      <Container className="pb-12">
        <section aria-labelledby="daily-card-title" className="grid gap-6 rounded-2xl bg-ink p-6 text-paper md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
          <div>
            <h2 id="daily-card-title" className="display text-2xl md:text-3xl">
              {t("daily.title")}
            </h2>
            <p className="mt-2 text-paper/75">{challenge ? t("home.mysteryFlags") : t("home.dailyNone")}</p>
            <ol className="mt-5 flex gap-2" aria-label={t("home.dailyRules")}>
              {MYSTERY.map((d, i) => (
                <li key={i} className="relative flex aspect-[4/3] w-12 items-center justify-center rounded-md bg-paper/10 font-semibold text-paper/80 md:w-16">
                  ?
                  <span className={`absolute bottom-1 end-1 size-1.5 rounded-full ${DOT[d]}`} aria-hidden="true" />
                  <span className="sr-only">{t(`difficulty.${d}`)}</span>
                </li>
              ))}
            </ol>
            {challenge ? (
              <Link href="/daily" className="btn mt-6 border-paper bg-paper text-ink hover:bg-parchment">
                {attempt?.status === "completed" ? t("daily.resultTitle") : attempt?.status === "active" ? t("daily.resume") : t("daily.start")}
              </Link>
            ) : null}
          </div>
          <div className="rounded-xl bg-paper/5 p-4 text-paper [&_.text-muted]:text-paper/60 [&_.text-ink]:text-paper">
            <Countdown targetIso={nextDayBoundary(now, gameConfig.daily.timezone).toISOString()} serverNowIso={now.toISOString()} />
          </div>
        </section>
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
