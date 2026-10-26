import type { ReactNode } from "react";

/** Editorial page heading: plate number + eyebrow, display title, optional lede. */
export function PageHeader({
  plate,
  eyebrow,
  title,
  lede,
  aside,
}: {
  plate: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-6 border-b border-ink pb-8 pt-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:pt-16">
      <div>
        <p className="eyebrow">
          <span className="tabular text-rust-ink">{plate}</span>
          <span className="mx-2 text-rule-strong" aria-hidden="true">—</span>
          {eyebrow}
        </p>
        <h1 className="display mt-4 text-[2.5rem] md:text-6xl">{title}</h1>
        {lede ? <p className="mt-4 max-w-2xl text-lg text-ink-soft">{lede}</p> : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}
