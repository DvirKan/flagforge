import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Container } from "@/components/ui/Container";

/** Two-column auth layout: form column + a quiet cartographic panel (desktop only). */
export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Container className="py-10 md:py-16">
      <div className="grid border border-ink bg-paper md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="p-6 md:p-10">
          <h1 className="display text-4xl md:text-5xl">{title}</h1>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 border-t border-rule pt-5 text-sm">{footer}</div> : null}
        </div>
        <div className="graticule relative hidden border-s border-ink md:block" aria-hidden="true">
          <BrandMark className="absolute bottom-8 end-8 h-16 w-24 text-ink/70" />
        </div>
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
