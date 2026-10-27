import Link from "next/link";
import { brand } from "@/config/brand";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted md:px-6 lg:px-10">
        <p>
          <span dir="ltr">© {new Date().getFullYear()} {brand.name}</span>
        </p>
        <nav aria-label={t("settings.eyebrow")} className="flex gap-5">
          <Link className="link-underline" href="/profile">{t("nav.profile")}</Link>
          <Link className="link-underline" href="/settings">{t("nav.settings")}</Link>
        </nav>
      </div>
    </footer>
  );
}
