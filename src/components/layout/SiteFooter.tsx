import Link from "next/link";
import { brand } from "@/config/brand";
import { getI18n } from "@/lib/i18n/server";
import { BrandMark } from "./BrandMark";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-24 border-t border-ink bg-parchment">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:px-6 lg:px-10">
        <div className="max-w-md">
          <div className="flex items-center gap-2 text-ink">
            <BrandMark className="h-5 w-7" />
            <span className="display text-lg font-semibold tracking-[0.06em]" dir="ltr">
              {brand.name}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">{t("footer.colophon")}</p>
          <p className="mt-1 text-sm text-muted">{t("footer.timezone")}</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <li><Link className="link-underline" href="/profile">{t("nav.profile")}</Link></li>
          <li><Link className="link-underline" href="/achievements">{t("nav.achievements")}</Link></li>
          <li><Link className="link-underline" href="/settings">{t("nav.settings")}</Link></li>
          <li><Link className="link-underline" href="/leaderboards">{t("nav.leaderboards")}</Link></li>
        </ul>
      </div>
      <div className="border-t border-rule">
        <p className="eyebrow mx-auto max-w-7xl px-4 py-3 tabular md:px-6 lg:px-10" dir="ltr">
          © {new Date().getFullYear()} {brand.name}
        </p>
      </div>
    </footer>
  );
}
