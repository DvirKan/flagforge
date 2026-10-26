import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/daily/Countdown";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { gameConfig } from "@/config/game";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { nextDayBoundary } from "@/lib/time/zoned";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("daily.title") };
}

export default async function DailyPage() {
  const { locale, t } = await getI18n();
  const now = new Date();
  const tz = gameConfig.daily.timezone;
  const dateLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: tz, dateStyle: "full" }).format(now);
  const rules = [t("daily.rule1"), t("daily.rule2"), t("daily.rule3"), t("daily.rule4")];

  return (
    <Container>
      <PageHeader plate="II" eyebrow={t("daily.eyebrow")} title={t("daily.title")} lede={dateLabel} />
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="rules-title" className="lg:col-span-7">
          <h2 id="rules-title" className="eyebrow">{t("daily.rulesTitle")}</h2>
          <ol className="mt-4 border-t border-ink">
            {rules.map((rule, i) => (
              <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 border-b border-rule py-4">
                <span className="font-mono text-sm text-rust-ink tabular">{String(i + 1).padStart(2, "0")}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </section>
        <aside className="border border-ink bg-paper p-6 lg:col-span-5">
          <p className="border-s-2 border-rust ps-3">{t("daily.noneToday", { date: dateLabel })}</p>
          <div className="rule-tick mt-6 pt-5">
            <Countdown targetIso={nextDayBoundary(now, tz).toISOString()} serverNowIso={now.toISOString()} />
          </div>
          <Link href="/login?next=/daily" className="btn btn-primary mt-6 w-full">
            {t("daily.signInToStart")}
          </Link>
        </aside>
      </div>
    </Container>
  );
}
