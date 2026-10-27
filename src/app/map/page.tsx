import type { Metadata } from "next";
import Link from "next/link";
import { AtlasExplorer, type AtlasCountry } from "@/components/atlas/AtlasExplorer";
import { AtlasMap } from "@/components/atlas/AtlasMap";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getViewer } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { allCountries } from "@/server/countries";
import { getMyDiscoveredCountries } from "@/server/progress/queries";

const CONTINENTS = [
  ["africa", "africa"],
  ["asia", "asia"],
  ["europe", "europe"],
  ["north-america", "northAmerica"],
  ["south-america", "southAmerica"],
  ["oceania", "oceania"],
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("map.title") };
}

export default async function MapPage() {
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const discovered = viewer ? await getMyDiscoveredCountries() : [];
  const firstAt = new Map(discovered.map((d) => [d.iso, d.firstAt]));
  const dateFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", year: "numeric" });
  const collator = new Intl.Collator(INTL_LOCALE[locale]);
  const continentLabel = (key: string) => {
    const entry = CONTINENTS.find(([k]) => k === key);
    return entry ? t(`continents.${entry[1]}`) : key;
  };

  const countries: AtlasCountry[] = allCountries()
    .map((c) => {
      const at = firstAt.get(c.iso2);
      return {
        iso: c.iso2,
        name: c.name[locale],
        capital: c.capital[locale],
        continent: c.continent,
        continentLabel: continentLabel(c.continent),
        discoveredOn: at ? dateFmt.format(new Date(at)) : null,
      };
    })
    .sort((a, b) => collator.compare(a.name, b.name));

  const total = countries.length;
  const count = firstAt.size;

  return (
    <Container>
      <PageHeader title={t("map.title")} lede={viewer ? t("map.discovered", { count, total }) : t("map.signInLede")} aside={
        !viewer ? (
          <Link href="/login?next=/map" className="btn btn-primary">
            {t("nav.signIn")}
          </Link>
        ) : undefined
      } />
      {viewer ? (
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-parchment-deep" aria-hidden="true">
          <div className="h-full rounded-full bg-success" style={{ width: `${(100 * count) / total}%` }} />
        </div>
      ) : null}
      <div className="mt-8">
        <AtlasExplorer
          map={<AtlasMap discovered={new Set(firstAt.keys())} label={t("map.mapLabel", { count, total })} />}
          countries={countries}
          continents={CONTINENTS.map(([key, msg]) => ({ key, label: t(`continents.${msg}`) }))}
          labels={{
            selectHint: t("map.selectHint"),
            notDiscovered: t("map.notDiscovered"),
            discoveredOn: t("map.discoveredOn", { date: "{date}" }),
            capital: t("game.capital"),
            continent: t("game.continent"),
            listTitle: t("map.listTitle"),
            filterAll: t("map.filterAll"),
            filterDiscovered: t("map.filterDiscovered"),
            filterMissing: t("map.filterMissing"),
            close: t("map.close"),
          }}
        />
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-success" />
          {t("map.legendDiscovered")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-[#cfc5b0]" />
          {t("map.legendUndiscovered")}
        </span>
        <span>{t("map.smallStates")}</span>
      </p>
    </Container>
  );
}
