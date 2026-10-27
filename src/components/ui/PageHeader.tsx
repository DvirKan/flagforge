import type { ReactNode } from "react";

/** Page heading: title, optional one-line lede, optional action on the side. */
export function PageHeader({ title, lede, aside }: { title: string; lede?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-4 pb-6 pt-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:pt-14">
      <div>
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {lede ? <p className="mt-3 max-w-2xl text-lg text-ink-soft">{lede}</p> : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}
