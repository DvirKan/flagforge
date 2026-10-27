import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, Flame } from "lucide-react";
import { AchievementIcon } from "@/components/achievements/AchievementIcon";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/time/format";
import { getAchievements, getMyStats } from "@/server/progress/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("profile.title") };
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ welcome?: string; password?: string }> }) {
  const viewer = await requireViewer("/profile");
  const { welcome, password } = await searchParams;
  const { locale, t } = await getI18n();
  const supabase = await createSupabaseServerClient();

  // RLS: only this user's sessions are visible.
  const [stats, achievements, { data: recent }] = await Promise.all([
    getMyStats(),
    getAchievements(true),
    supabase!
      .from("game_sessions")
      .select("id, difficulty, correct_count, total_questions, score, elapsed_ms, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  const dateFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", year: "numeric" });
  const memberSince = dateFmt.format(new Date(viewer.createdAt));
  const num = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const pct = (correct: number, answered: number) => (answered > 0 ? `${Math.round((100 * correct) / answered)}%` : t("profile.none"));
  const days = (n: number) => (n === 1 ? t("profile.oneDay") : t("profile.days", { count: n }));
  const earned = achievements.filter((a) => a.earnedAt).sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
  const Arrow = locale === "he" ? ArrowUpLeft : ArrowUpRight;
  const s = stats;

  return (
    <Container>
      <PageHeader
        title={viewer.displayName ?? viewer.username}
        lede={
          <>
            <span dir="auto">@{viewer.username}</span> · {t("profile.memberSince", { date: memberSince })}
          </>
        }
        aside={
          <Link href="/settings" className="btn btn-ghost">
            {t("nav.settings")}
          </Link>
        }
      />
      {welcome ? <p role="status" className="mt-6 border-s-2 border-success ps-3">{t("profile.welcome")}</p> : null}
      {password === "updated" ? <p role="status" className="mt-6 border-s-2 border-success ps-3">{t("profile.passwordUpdated")}</p> : null}

      {s ? (
        <>
          <section aria-labelledby="streak-title" className="mt-10 flex flex-wrap items-center gap-6 rounded-2xl bg-ink px-6 py-6 text-paper shadow-lift md:px-8">
            <span className="grid size-14 place-items-center rounded-full bg-[#3a2a1c] text-[#f0a35e]">
              <Flame aria-hidden="true" className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="streak-title" className="text-sm text-paper/70">{t("profile.currentStreak")}</h2>
              <p className="display mt-1 text-4xl">{days(s.streak.current)}</p>
              {s.streak.current === 0 ? <p className="mt-1 text-sm text-paper/70">{t("profile.streakHint")}</p> : null}
            </div>
            <div className="text-end">
              <p className="text-sm text-paper/70">{t("profile.longestStreak")}</p>
              <p className="mt-1 text-xl font-medium">{days(s.streak.longest)}</p>
            </div>
          </section>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <StatGroup
              title={t("profile.dailyTitle")}
              items={[
                [t("profile.dailyCompleted"), num.format(s.daily.completed)],
                [t("profile.dailyPerfect"), num.format(s.daily.perfect)],
                [t("profile.fastestPerfect"), s.daily.fastest_perfect_ms === null ? t("profile.none") : formatDuration(s.daily.fastest_perfect_ms, { tenths: true }), true],
                [t("profile.accuracy"), pct(s.daily.correct_answers, s.daily.questions_answered), true],
              ]}
            />
            <StatGroup
              title={t("profile.standardTitle")}
              items={[
                [t("profile.gamesCompleted"), num.format(s.standard.games_completed)],
                [t("profile.perfectGames"), num.format(s.standard.perfect_games)],
                [t("profile.bestScore"), num.format(s.standard.best_score)],
                [t("profile.accuracy"), pct(s.standard.correct_answers, s.standard.questions_answered), true],
              ]}
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Link href="/map" className="group rounded-2xl bg-paper p-6 shadow-card transition-shadow hover:shadow-lift">
              <span className="flex items-center justify-between gap-3">
                <span className="display text-2xl">{t("profile.countriesTitle")}</span>
                <Arrow aria-hidden="true" className="size-5 text-muted transition-colors group-hover:text-ink" />
              </span>
              <span className="mt-2 block text-ink-soft">{t("profile.countriesDiscovered", { count: s.countries_discovered, total: s.countries_total })}</span>
              <span className="mt-4 block h-2 overflow-hidden rounded-full bg-parchment-deep" aria-hidden="true">
                <span className="block h-full rounded-full bg-success" style={{ width: `${(100 * s.countries_discovered) / Math.max(1, s.countries_total)}%` }} />
              </span>
            </Link>
            <Link href="/achievements" className="group rounded-2xl bg-paper p-6 shadow-card transition-shadow hover:shadow-lift">
              <span className="flex items-center justify-between gap-3">
                <span className="display text-2xl">{t("profile.achievementsTitle")}</span>
                <Arrow aria-hidden="true" className="size-5 text-muted transition-colors group-hover:text-ink" />
              </span>
              <span className="mt-2 block text-ink-soft">{t("profile.achievementsEarned", { count: earned.length, total: achievements.length })}</span>
              {earned.length > 0 ? (
                <span className="mt-4 flex flex-wrap gap-2">
                  {earned.slice(0, 6).map((a) => (
                    <span key={a.code} title={locale === "he" ? a.nameHe : a.nameEn} className="grid size-10 place-items-center rounded-full bg-[#fbf1d9] text-[#a8730c]">
                      <AchievementIcon iconKey={a.iconKey} className="size-5" />
                    </span>
                  ))}
                </span>
              ) : null}
            </Link>
          </div>
        </>
      ) : null}

      <section className="mt-12" aria-labelledby="recent-title">
        <h2 id="recent-title" className="display text-3xl">
          {t("profile.recentGames")}
        </h2>
        {recent && recent.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-rule text-start">
                  {[t("profile.colDate"), t("profile.colDifficulty"), t("profile.colResult"), t("profile.colTime"), t("profile.colScore")].map((h) => (
                    <th key={h} scope="col" className="eyebrow py-2 text-start font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((g) => (
                  <tr key={g.id} className="border-b border-rule">
                    <td className="py-3">{g.completed_at ? dateFmt.format(new Date(g.completed_at)) : "—"}</td>
                    <td className="py-3">{t(`difficulty.${g.difficulty as "easy" | "medium" | "hard"}`)}</td>
                    <td className="py-3 font-mono tabular" dir="ltr">
                      {g.correct_count}/{g.total_questions}
                    </td>
                    <td className="py-3 font-mono tabular" dir="ltr">
                      {formatDuration(Number(g.elapsed_ms ?? 0))}
                    </td>
                    <td className="py-3 font-mono tabular">{g.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 border-y border-rule py-8">
            <p className="text-ink-soft">{t("profile.noGames")}</p>
            <Link href="/play" className="btn btn-primary mt-4">
              {t("profile.playNow")}
            </Link>
          </div>
        )}
      </section>
    </Container>
  );
}

function StatGroup({ title, items }: { title: string; items: [label: string, value: string, ltr?: boolean][] }) {
  return (
    <section className="rounded-2xl bg-paper p-6 shadow-card">
      <h2 className="display text-xl">{title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
        {items.map(([label, value, ltr]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-medium tabular">
              <span dir={ltr ? "ltr" : undefined}>{value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
