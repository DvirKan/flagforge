import type { Metadata } from "next";
import Link from "next/link";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getI18n } from "@/lib/i18n/server";

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("leaderboards.title") };
}

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: raw } = await searchParams;
  const period: Period = PERIODS.find((p) => p === raw) ?? "daily";
  const { t } = await getI18n();

  return (
    <Container>
      <PageHeader plate="III" eyebrow={t("leaderboards.eyebrow")} title={t("leaderboards.title")} />
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
      <p className="mt-6 text-sm text-muted">{period === "daily" ? t("leaderboards.dailyRule") : t("leaderboards.periodRule")}</p>
      <div className="mt-8 border-y border-ink py-12 text-center">
        <p className="display text-2xl">{t("leaderboards.empty")}</p>
      </div>
      <ConstructionNotice phase={period === "daily" ? 4 : 5} />
    </Container>
  );
}
