import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/** Centered single-column card for auth forms. */
export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-md rounded-2xl bg-paper p-6 shadow-card md:p-10">
        <h1 className="display text-3xl md:text-4xl">{title}</h1>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-8 border-t border-rule pt-5 text-sm">{footer}</div> : null}
      </div>
    </Container>
  );
}

export function AuthFooterLink({ prompt, href, label }: { prompt?: string; href: string; label: string }) {
  return (
    <p className="text-muted">
      {prompt ? <>{prompt} </> : null}
      <Link href={href} className="text-ink link-underline">
        {label}
      </Link>
    </p>
  );
}
