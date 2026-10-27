import Link from "next/link";
import { brand } from "@/config/brand";
import { signOutAction } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { BrandMark } from "./BrandMark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";
import { primaryNav } from "./nav-items";

export async function SiteHeader() {
  const { t } = await getI18n();
  const viewer = await getViewer();

  return (
    <header className="border-b border-rule bg-parchment">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6 md:px-6 md:py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label={brand.name}>
          <BrandMark className="h-6 w-9 shrink-0" />
          <span className="display text-[1.375rem] font-semibold tracking-[0.06em] max-[359px]:text-lg max-[359px]:tracking-[0.03em] md:text-2xl" dir="ltr">
            {brand.name}
          </span>
        </Link>

        <nav aria-label={t("a11y.primaryNav")} className="hidden flex-1 lg:block">
          <ol className="flex items-center justify-center gap-7">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="block border-b-2 border-transparent py-1 text-[0.9375rem] text-ink transition-colors hover:border-rule-strong"
                  activeClassName="!border-rust"
                >
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ol>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <LanguageSwitcher className="inline-flex size-11 items-center justify-center border border-ink/20 text-ink hover:bg-paper disabled:opacity-50" />
          {viewer ? (
            <>
              <Link href="/profile" className="hidden items-center gap-2 px-3 py-2 text-[0.9375rem] md:inline-flex" dir="ltr">
                <span aria-hidden="true" className="size-2 rounded-full bg-success" />
                <span className="link-underline">{viewer.username}</span>
              </Link>
              <form action={signOutAction} className="hidden md:block">
                <button type="submit" className="btn btn-ghost">
                  {t("auth.signOut")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 py-2 text-[0.9375rem] link-underline md:inline-block">
                {t("nav.signIn")}
              </Link>
              <Link href="/register" className="btn btn-primary hidden md:inline-flex">
                {t("nav.register")}
              </Link>
            </>
          )}
          <div className="lg:hidden">
            <MobileMenu username={viewer?.username ?? null} />
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
