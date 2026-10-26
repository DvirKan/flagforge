import Link from "next/link";
import { brand } from "@/config/brand";
import { gameConfig } from "@/config/game";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { dayOfYearIn } from "@/lib/time/zoned";
import { BrandMark } from "./BrandMark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";
import { primaryNav } from "./nav-items";

export async function SiteHeader() {
  const { locale, t } = await getI18n();
  const now = new Date();
  const tz = gameConfig.daily.timezone;
  const dateLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <header className="border-b border-ink bg-parchment">
      {/* Masthead strip — edition number is the day of the year in the challenge timezone. */}
      <div className="hidden border-b border-rule md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 lg:px-10">
          <p className="eyebrow tabular">
            <span>{t("masthead.edition", { number: dayOfYearIn(now, tz) })}</span>
            <span className="mx-2 text-rule-strong" aria-hidden="true">
              /
            </span>
            <span className="normal-case tracking-normal">{dateLabel}</span>
          </p>
          <p className="eyebrow tabular" dir="ltr">
            {brand.coordinates}
            <span className="mx-2 text-rule-strong" aria-hidden="true">
              /
            </span>
            <span lang={locale}>{t("masthead.timezoneNote")}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6 md:px-6 md:py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label={brand.name}>
          <BrandMark className="h-6 w-9 shrink-0" />
          <span className="display text-[1.375rem] font-semibold tracking-[0.06em] max-[359px]:text-lg max-[359px]:tracking-[0.03em] md:text-2xl" dir="ltr">
            {brand.name}
          </span>
        </Link>

        <nav aria-label={t("a11y.primaryNav")} className="hidden flex-1 lg:block">
          <ol className="flex items-center justify-center gap-7">
            {primaryNav.map((item, index) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="group flex items-baseline gap-1.5 border-b-2 border-transparent py-1 text-[0.9375rem] text-ink transition-colors hover:border-rule-strong"
                  activeClassName="!border-rust"
                >
                  <span className="font-mono text-[0.625rem] text-muted tabular" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ol>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <LanguageSwitcher className="inline-flex size-11 items-center justify-center border border-ink/20 text-ink hover:bg-paper disabled:opacity-50" />
          <Link href="/login" className="hidden px-3 py-2 text-[0.9375rem] link-underline md:inline-block">
            {t("nav.signIn")}
          </Link>
          <Link href="/register" className="btn btn-primary hidden md:inline-flex">
            {t("nav.register")}
          </Link>
          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
      {/* Tablet: secondary row with section links (desktop shows them inline above). */}
      <nav aria-label={t("a11y.primaryNav")} className="hidden border-t border-rule md:block lg:hidden">
        <ol className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-6 py-2">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} className="block py-1 text-sm text-ink" activeClassName="text-rust-ink underline underline-offset-4">
                {t(item.label)}
              </NavLink>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
