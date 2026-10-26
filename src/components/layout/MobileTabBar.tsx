import { CalendarDays, Globe2, Play, Trophy } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { HideDuringGame } from "./HideDuringGame";
import { NavLink } from "./NavLink";

/** Bottom tab bar on phones: one-thumb access to the game and the daily challenge. */
export async function MobileTabBar() {
  const { t } = await getI18n();
  const items = [
    { href: "/play", label: t("nav.play"), Icon: Play },
    { href: "/daily", label: t("nav.daily"), Icon: CalendarDays },
    { href: "/leaderboards", label: t("nav.leaderboards"), Icon: Trophy },
    { href: "/map", label: t("nav.map"), Icon: Globe2 },
  ];
  return (
    <HideDuringGame>
    <nav
      aria-label={t("a11y.mobileNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-parchment/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <NavLink
              href={href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] text-muted"
              activeClassName="!text-rust-ink"
            >
              <Icon className="size-5" aria-hidden="true" strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
    </HideDuringGame>
  );
}
