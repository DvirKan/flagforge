"use client";

import { Check, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

export interface AtlasCountry {
  iso: string;
  name: string;
  capital: string;
  continent: string;
  continentLabel: string;
  discoveredOn: string | null; // already formatted for display
}

interface Labels {
  selectHint: string;
  notDiscovered: string;
  discoveredOn: string; // contains {date}
  capital: string;
  continent: string;
  listTitle: string;
  filterAll: string;
  filterDiscovered: string;
  filterMissing: string;
  close: string;
}

type Filter = "all" | "found" | "missing";

/**
 * Interactive layer over the server-rendered map: click a country (or pick it from the list) to see its card.
 * The list is the accessible way in — every country is a button, grouped by continent, with its status.
 */
export function AtlasExplorer({ map, countries, labels, continents }: { map: ReactNode; countries: AtlasCountry[]; labels: Labels; continents: { key: string; label: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const panelRef = useRef<HTMLElement>(null);
  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries]);
  const current = selected ? byIso.get(selected) : undefined;

  const visible = countries.filter((c) => (filter === "all" ? true : filter === "found" ? c.discoveredOn : !c.discoveredOn));

  function onMapClick(e: React.MouseEvent) {
    const el = (e.target as Element).closest("[data-iso]");
    const iso = el?.getAttribute("data-iso");
    if (iso && byIso.has(iso)) setSelected(iso);
  }

  return (
    <>
      {selected ? (
        <style>{`.atlas-country[data-iso="${selected}"]{stroke:#9e4a26;stroke-width:1.6;}`}</style>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Mouse/touch shortcut; the country list below is the keyboard and screen-reader path. */}
        <div onClick={onMapClick} className="overflow-hidden rounded-2xl bg-paper p-2 shadow-card sm:p-4">
          {map}
        </div>
        <aside ref={panelRef} aria-live="polite" className="rounded-2xl bg-paper p-5 shadow-card">
          {current ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="display text-2xl">{current.name}</h2>
                <button type="button" onClick={() => setSelected(null)} className="rounded-full p-1 text-muted hover:bg-parchment hover:text-ink" aria-label={labels.close}>
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              <div className="mt-4 w-40 overflow-hidden rounded-lg border border-rule bg-parchment lg:w-full">
                {current.discoveredOn ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static same-origin SVG
                  <img src={`/api/flags/${current.iso.toLowerCase()}`} alt="" className="block aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center text-4xl font-medium text-rule-strong lg:text-5xl" aria-hidden="true">
                    ?
                  </div>
                )}
              </div>
              <p className={["mt-4 text-sm", current.discoveredOn ? "text-success" : "text-muted"].join(" ")}>
                {current.discoveredOn ? labels.discoveredOn.replace("{date}", current.discoveredOn) : labels.notDiscovered}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">{labels.continent}</dt>
                  <dd className="mt-0.5">{current.continentLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted">{labels.capital}</dt>
                  <dd className="mt-0.5">{current.discoveredOn ? current.capital : "—"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-ink-soft">{labels.selectHint}</p>
          )}
        </aside>
      </div>

      <section aria-labelledby="atlas-list" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="atlas-list" className="display text-2xl">
            {labels.listTitle}
          </h2>
          <div role="group" aria-label={labels.listTitle} className="flex gap-1 rounded-full bg-paper p-1 shadow-card">
            {(
              [
                ["all", labels.filterAll],
                ["found", labels.filterDiscovered],
                ["missing", labels.filterMissing],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={["rounded-full px-4 py-1.5 text-sm", filter === key ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {continents.map(({ key, label }) => {
            const items = visible.filter((c) => c.continent === key);
            const all = countries.filter((c) => c.continent === key);
            const found = all.filter((c) => c.discoveredOn).length;
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <h3 className="flex items-baseline justify-between gap-2 border-b border-rule pb-2 font-medium">
                  <span>{label}</span>
                  <span className="text-sm text-muted tabular" dir="ltr">
                    {found}/{all.length}
                  </span>
                </h3>
                <ul className="mt-2">
                  {items.map((c) => (
                    <li key={c.iso}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(c.iso);
                          panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        aria-current={selected === c.iso ? "true" : undefined}
                        className={["flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-paper", selected === c.iso ? "bg-paper font-medium" : ""].join(" ")}
                      >
                        <span className={["grid size-4 shrink-0 place-items-center rounded-full", c.discoveredOn ? "bg-success text-paper" : "border border-rule-strong"].join(" ")}>
                          {c.discoveredOn ? <Check aria-hidden="true" className="size-3" /> : null}
                        </span>
                        <span className={c.discoveredOn ? "text-ink" : "text-ink-soft"}>{c.name}</span>
                        <span className="sr-only">{c.discoveredOn ? ` — ${labels.discoveredOn.replace("{date}", c.discoveredOn)}` : ` — ${labels.filterMissing}`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
