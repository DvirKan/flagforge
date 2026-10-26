import type { ReactNode } from "react";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-10", className].filter(Boolean).join(" ")}>{children}</div>;
}
