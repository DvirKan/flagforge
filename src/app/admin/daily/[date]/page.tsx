import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/AdminForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Container } from "@/components/ui/Container";
import { dailyAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCalendarDate } from "@/lib/time/zoned";
import { getChallenge } from "@/server/admin/calendar";
import { allCountries, getCountry } from "@/server/countries";
import { todayChallengeDate } from "@/server/daily/queries";
import { supabaseRpc } from "@/server/game/rpc";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.title") };
}

export default async function AdminDailyPage({ params }: { params: Promise<{ date: string }> }) {
  await requireAdmin();
  const { date } = await params;
  let parts;
  try {
    parts = parseCalendarDate(date);
  } catch {
    notFound();
  }
  const { locale, t } = await getI18n();
  const today = todayChallengeDate();
  const c = await getChallenge(supabaseRpc(createSupabaseAdminClient()), date);
  const title = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "UTC", dateStyle: "full" }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
  const name = (iso: string) => getCountry(iso)?.name[locale] ?? iso;
  const past = date < today;
  const editable = !past && c.status === "draft";
  const canUnpublish = c.status === "published" && date > today && (c.attempts ?? 0) === 0;
  const problems = c.problems ?? [];
  const collator = new Intl.Collator(INTL_LOCALE[locale]);
  const fields = (intent: string, extra: Record<string, string> = {}) => ({ intent, date, ...extra });

  return (
    <Container>
      <div className="pt-8 md:pt-12">
        <Link href="/admin" className="text-sm link-underline">
          {t("admin.back")}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="display text-3xl md:text-4xl">{title}</h1>
          <StatusBadge status={c.status} />
        </div>
        {c.status !== "missing" ? (
          <p className="mt-2 text-sm text-muted">
            {t("admin.detailStats", { attempts: c.attempts ?? 0, completed: c.completed ?? 0, perfect: c.perfect ?? 0 })}
            {c.published_at ? ` · ${t("admin.publishedAt", { date: new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Asia/Jerusalem", dateStyle: "medium", timeStyle: "short" }).format(new Date(c.published_at)) })}` : ""}
          </p>
        ) : null}
      </div>

      {past ? <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-sm text-ink-soft shadow-card">{t("admin.pastDate")}</p> : null}
      {!past && c.status === "published" ? (
        <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-sm text-ink-soft shadow-card">{canUnpublish ? t("admin.lockedPublished") : t("admin.lockedLive")}</p>
      ) : null}

      {c.status === "missing" ? (
        <section className="mt-8 rounded-2xl bg-paper p-6 shadow-card">
          <p className="text-ink-soft">{t("admin.noChallenge")}</p>
          {!past ? <AdminForm action={dailyAction} fields={fields("generate")} label={t("admin.generate")} variant="primary" className="mt-4" /> : null}
        </section>
      ) : (
        <>
          <section aria-labelledby="valid-title" className="mt-8">
            <h2 id="valid-title" className="sr-only">
              {t("admin.validTitle")}
            </h2>
            {problems.length === 0 ? (
              <p className="rounded-xl border-s-4 border-success bg-success-wash px-4 py-3 text-sm text-success">{t("admin.valid")}</p>
            ) : (
              <div className="rounded-xl border-s-4 border-danger bg-danger-wash px-4 py-3 text-sm text-danger">
                <p>{t("admin.invalid")}</p>
                <ul className="mt-1 list-disc ps-5">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {editable || canUnpublish ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {editable && problems.length === 0 ? <AdminForm action={dailyAction} fields={fields("publish")} label={t("admin.publish")} variant="accent" confirm /> : null}
              {editable ? <AdminForm action={dailyAction} fields={fields("generate")} label={t("admin.regenerate")} confirm /> : null}
              {editable ? <AdminForm action={dailyAction} fields={fields("delete")} label={t("admin.deleteDraft")} variant="danger" confirm /> : null}
              {canUnpublish ? <AdminForm action={dailyAction} fields={fields("unpublish")} label={t("admin.unpublish")} variant="danger" confirm /> : null}
            </div>
          ) : null}

          <ol className="mt-8 grid gap-4">
            {(c.questions ?? []).map((q) => {
              const pool = allCountries()
                .filter((x) => x.difficulty === q.difficulty && !(c.questions ?? []).some((o) => o.country === x.iso2))
                .sort((a, b) => collator.compare(a.name[locale], b.name[locale]));
              return (
                <li key={q.position} className="flex flex-col gap-4 rounded-2xl bg-paper p-4 shadow-card sm:flex-row sm:items-start md:p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static same-origin SVG */}
                  <img src={`/api/flags/${q.country.toLowerCase()}`} alt="" className="aspect-[4/3] w-32 shrink-0 rounded-md border border-rule object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">
                      {t("admin.question", { position: q.position })} · {t(`difficulty.${q.difficulty}`)}
                    </p>
                    <p className="mt-0.5 text-xl font-medium">
                      {name(q.country)} <span className="font-mono text-sm text-muted">{q.country}</span>
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="text-muted">{t("admin.options")}: </span>
                      {q.options.map((o, i) => (
                        <span key={o} className={o === q.country ? "font-medium text-success" : ""}>
                          {name(o)}
                          {i < q.options.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </p>
                    {q.answered > 0 ? <p className="mt-1 text-sm text-muted">{t("admin.answerRate", { correct: q.correct, answered: q.answered })}</p> : null}
                    {editable ? (
                      <AdminForm action={dailyAction} fields={fields("replace", { position: String(q.position) })} label={t("admin.replace")} className="mt-3">
                        <label className="sr-only" htmlFor={`iso-${q.position}`}>
                          {t("admin.replaceWith")}
                        </label>
                        <select id={`iso-${q.position}`} name="iso" defaultValue="" className="field-input w-64 max-w-full">
                          <option value="">{t("admin.randomCountry")}</option>
                          {pool.map((x) => (
                            <option key={x.iso2} value={x.iso2}>
                              {x.name[locale]}
                            </option>
                          ))}
                        </select>
                      </AdminForm>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Container>
  );
}
