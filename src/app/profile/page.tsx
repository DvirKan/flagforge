import type { Metadata } from "next";
import Link from "next/link";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/time/format";

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
  const [{ count }, { data: recent }] = await Promise.all([
    supabase!.from("game_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase!
      .from("game_sessions")
      .select("id, difficulty, correct_count, total_questions, score, elapsed_ms, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  const dateFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", year: "numeric" });
  const memberSince = dateFmt.format(new Date(viewer.createdAt));

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

      <dl className="mt-10 grid grid-cols-2 border-y border-ink md:grid-cols-4">
        <div className="py-4">
          <dt className="eyebrow">{t("profile.gamesCompleted")}</dt>
          <dd className="mt-1 font-mono text-3xl tabular">{count ?? 0}</dd>
        </div>
      </dl>

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
      <ConstructionNotice phase={5} />
    </Container>
  );
}
