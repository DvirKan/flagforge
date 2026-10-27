import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/daily/Countdown";
import { DailyLeaderboard } from "@/components/daily/DailyLeaderboard";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { gameConfig } from "@/config/game";
import { getViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDuration } from "@/lib/time/format";
import { nextDayBoundary } from "@/lib/time/zoned";
import { getDailyLeaderboard, getMyAttempt, getPublishedChallenge, todayChallengeDate } from "@/server/daily/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("daily.title") };
}

export default async function DailyPage() {
  const { locale, t } = await getI18n();
  const now = new Date();
  const tz = gameConfig.daily.timezone;
  const date = todayChallengeDate(now);
  const dateLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: tz, dateStyle: "full" }).format(now);
  const timeFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const [viewer, challenge, board] = await Promise.all([getViewer(), getPublishedChallenge(date), getDailyLeaderboard(date)]);
  const attempt = viewer && challenge ? await getMyAttempt(challenge.id) : null;
  const rules = [t("daily.rule1"), t("daily.rule2"), t("daily.rule3"), t("daily.rule4")];

  let action;
  if (!challenge) {
    action = <p className="border-s-2 border-rust ps-3">{t("daily.noneToday", { date: dateLabel })}</p>;
  } else if (!viewer) {
    action = (
      <Link href="/login?next=/daily" className="btn btn-primary w-full">
        {t("daily.signInToStart")}
      </Link>
    );
  } else if (attempt?.status === "completed") {
    action = (
      <div>
        <p className="text-sm text-muted">{t("daily.resultTitle")}</p>
        <p className="display mt-2 text-3xl">{attempt.correct === 5 ? t("daily.perfect") : t("daily.resultLine", { correct: attempt.correct })}</p>
        <p className="mt-1 font-mono text-2xl tabular" dir="ltr">
          {formatDuration(attempt.elapsedMs ?? 0, { tenths: true })}
        </p>
        <Link href="/daily/play" className="mt-3 inline-block text-sm link-underline">
          {t("daily.reviewTitle")}
        </Link>
      </div>
    );
  } else if (attempt?.status === "active") {
    action = (
      <div className="grid gap-3">
        <p className="text-sm text-ink-soft">{t("daily.resumeNote", { time: timeFmt.format(new Date(attempt.startedAt)) })}</p>
        <Link href="/daily/play" className="btn btn-accent w-full">
          {t("daily.resume")}
        </Link>
      </div>
    );
  } else {
    action = (
      <div className="grid gap-3">
        <p>{t("daily.live")}</p>
        <Link href="/daily/play" className="btn btn-accent w-full">
          {t("daily.start")}
        </Link>
      </div>
    );
  }

  return (
    <Container>
      <PageHeader title={t("daily.title")} lede={dateLabel} />
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="rules-title" className="lg:col-span-7">
          <h2 id="rules-title" className="display text-2xl">{t("daily.rulesTitle")}</h2>
          <ol className="mt-4 grid list-decimal gap-3 ps-5 text-ink-soft marker:text-muted">
            {rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ol>
        </section>
        <aside className="grid content-start gap-6 rounded-sm bg-paper p-6 shadow-[0_1px_0_var(--color-rule)] md:p-8 lg:col-span-5">
          {action}
          <div className="border-t border-rule pt-5">
            <Countdown targetIso={nextDayBoundary(now, tz).toISOString()} serverNowIso={now.toISOString()} />
          </div>
        </aside>
      </div>
      <section aria-labelledby="board-title" className="mt-14">
        <h2 id="board-title" className="display text-2xl">
          {t("daily.leaderboardTitle")}
        </h2>
        <div className="mt-4">
          <DailyLeaderboard rows={board} highlight={viewer?.username} />
        </div>
      </section>
    </Container>
  );
}
