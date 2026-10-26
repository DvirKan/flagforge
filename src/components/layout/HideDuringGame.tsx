"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Routes where the mobile tab bar is hidden so the answer buttons fit on one screen. */
export const FOCUSED_ROUTES = [/^\/play\/(easy|medium|hard)\/?$/];

export function HideDuringGame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (FOCUSED_ROUTES.some((re) => re.test(pathname))) return null;
  return <>{children}</>;
}
