"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isActivePath } from "./nav-items";

export function NavLink({
  href,
  children,
  className,
  activeClassName,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[className, active ? activeClassName : undefined].filter(Boolean).join(" ")}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}
