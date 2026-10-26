import type { MessageKey } from "@/lib/i18n/translate";

export interface NavItem {
  href: string;
  label: MessageKey;
}

/** Primary sections, in editorial order. Numbered in the desktop masthead. */
export const primaryNav: readonly NavItem[] = [
  { href: "/play", label: "nav.play" },
  { href: "/daily", label: "nav.daily" },
  { href: "/leaderboards", label: "nav.leaderboards" },
  { href: "/map", label: "nav.map" },
  { href: "/achievements", label: "nav.achievements" },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
