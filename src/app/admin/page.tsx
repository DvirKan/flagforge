import type { Metadata } from "next";
import Link from "next/link";
import { AdminForm } from "@/components/admin/AdminForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { fillAheadAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addCalendarDays, parseCalendarDate } from "@/lib/time/zoned";
import { getAudit, getCalendar, getOverview } from "@/server/admin/calendar";
import { todayChallengeDate } from "@/server/daily/queries";
import { supabaseRpc } from "@/server/game/rpc";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.title") };
}

const WINDOW = 28;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireAdmin(); // database-backed role check; non-admins get a 404
  const { from: rawFrom } = await searchParams;
  const { locale, t } = await getI18n();
  const today = todayChallengeDate();
  let from = addCalendarDays(today, -3);
  if (rawFrom) {
    try {
      parseCalendarDate(rawFrom);
      from = rawFrom;
    } catch {
      /* keep default */
    }
  }
  const to = addCalendarDays(from, WINDOW - 1);
  const rpc = supabaseRpc(createSupabaseAdminClient());
  const [overview, calendar, audit] = await Promise.all([getOverview(rpc), getCalendar(rpc, from, to), getAudit(rpc, 25)]);

  const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions) => {
    const { year, month, day } = parseCalendarDate(d);
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(year, month - 1, day)));
  };
  const fmtTime = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" });
  const num = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const covered = overview.first_unpublished ? addCalendarDays(overview.first_unpublished, -1) : null;

  const stats: [string, string][] = [
    [t("admin.statPlayers"), num.format(overview.players)],
    [t("admin.statNew"), num.format(overview.players_7d)],
    [t("admin.statGames"), num.format(overview.games_7d)],
    [t("admin.statToday"), t("admin.statTodayValue", { completed: overview.today_completed, started: overview.today_attempts })],
    [t("admin.statCovered"), covered && covered >= today ? fmtDate(covered, { day: "numeric", month: "short", year: "numeric" }) : t("admin.statCoveredNone")],
  ];

  return (
    <Container>
      <PageHeader title={t("admin.title")} lede={t("admin.lede")} />

      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([label, value], i) => (
          <div key={label} className={["rounded-xl bg-paper p-4 shadow-card", i === 4 && !(covered && covered >= today) ? "ring-2 ring-danger" : ""].join(" ")}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-medium tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="fill-title" className="mt-8 rounded-2xl bg-paper p-5 shadow-card md:p-6">
        <h2 id="fill-title" className="display text-xl">
          {t("admin.fillTitle")}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">{t("admin.fillBody")}</p>
        <AdminForm action={fillAheadAction} fields={{}} label={t("admin.fillSubmit")} variant="primary" confirm className="mt-4">
          <label className="flex items-center gap-2 text-sm">
            {t("admin.fillDays")}
            <select name="days" defaultValue="30" className="field-input w-24">
              {[7, 14, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </AdminForm>
      </section>

      <section aria-labelledby="cal-title" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="cal-title" className="display text-2xl">
            {t("admin.calendarTitle")}
          </h2>
          <div className="flex gap-4 text-sm">
            <Link href={`/admin?from=${addCalendarDays(from, -WINDOW)}`} className="link-underline">
              {t("admin.earlier")}
            </Link>
            <Link href="/admin" className="link-underline">
              {t("admin.today")}
            </Link>
            <Link href={`/admin?from=${addCalendarDays(from, WINDOW)}`} className="link-underline">
              {t("admin.later")}
            </Link>
          </div>
        </div>
        <ul className="mt-4 overflow-hidden rounded-xl bg-paper shadow-card">
          {calendar.map((day) => (
            <li key={day.date} className={["border-b border-rule last:border-b-0", day.date === today ? "bg-[#fbf1d9]" : ""].join(" ")}>
              <Link href={`/admin/daily/${day.date}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-parchment/60">
                <span className="w-36 shrink-0">
                  <span className="block font-medium">{fmtDate(day.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                  {day.date === today ? <span className="text-xs text-rust-ink">{t("admin.today")}</span> : null}
                </span>
                <StatusBadge status={day.status} />
                <span className="flex gap-1" aria-hidden="true">
                  {day.countries.map((iso) => (
                    // eslint-disable-next-line @next/next/no-img-element -- static same-origin SVG
                    <img key={iso} src={`/api/flags/${iso.toLowerCase()}`} alt="" className="h-5 w-[1.666rem] rounded-sm border border-rule object-cover" />
                  ))}
                </span>
                <span className="ms-auto flex gap-3 text-sm text-muted">
                  {day.attempts > 0 ? <span>{t("admin.attempts", { count: day.attempts })}</span> : null}
                  {day.status !== "missing" && day.problems.length > 0 ? <span className="text-danger">{t("admin.problems", { count: day.problems.length })}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="audit-title" className="mt-10">
        <h2 id="audit-title" className="display text-2xl">
          {t("admin.auditTitle")}
        </h2>
        {audit.length === 0 ? (
          <p className="mt-4 text-ink-soft">{t("admin.auditEmpty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl bg-paper shadow-card">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule text-muted">
                  <th scope="col" className="px-4 py-2 text-start font-medium">{t("admin.colWhen")}</th>
                  <th scope="col" className="py-2 text-start font-medium">{t("admin.colWho")}</th>
                  <th scope="col" className="py-2 text-start font-medium">{t("admin.colAction")}</th>
                  <th scope="col" className="px-4 py-2 text-start font-medium">{t("admin.colTarget")}</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-2 text-muted tabular">
                      <span dir="ltr">{fmtTime.format(new Date(a.created_at))}</span>
                    </td>
                    <td className="py-2">{a.source === "script" ? t("admin.auditScript") : <span dir="auto">{a.actor ?? "—"}</span>}</td>
                    <td className="py-2">{t(`admin.actions.${a.action.replace(".", "_")}` as MessageKey)}</td>
                    <td className="px-4 py-2 tabular">
                      {a.target ? (
                        <Link href={`/admin/daily/${a.target}`} className="link-underline" dir="ltr">
                          {a.target}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}
