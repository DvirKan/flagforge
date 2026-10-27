import atlas from "@/data/atlas.json";

type AtlasEntry = { d?: string; dot?: number[] };
const countries = atlas.countries as Record<string, AtlasEntry>;

/**
 * The world map, rendered on the server so the ~110 KB of path data never ships as JavaScript.
 * Every UN member carries data-iso; the client explorer handles clicks by event delegation.
 * Colours are set by class so the explorer can restyle the selected country with one CSS rule.
 */
export function AtlasMap({ discovered, label }: { discovered: ReadonlySet<string>; label: string }) {
  const entries = Object.entries(countries);
  return (
    <svg viewBox={`0 0 ${atlas.width} ${atlas.height}`} role="img" aria-label={label} className="block h-auto w-full">
      <path d={atlas.background} className="fill-[#e2dac8]" />
      {entries.map(([iso, c]) =>
        c.d ? (
          <path
            key={iso}
            d={c.d}
            data-iso={iso}
            className={["atlas-country cursor-pointer stroke-paper [stroke-width:0.5]", discovered.has(iso) ? "fill-success" : "fill-[#cfc5b0]"].join(" ")}
          />
        ) : null,
      )}
      {/* Small states: a dot on top of (or instead of) the shape, so they can be seen and clicked. */}
      {entries.map(([iso, c]) =>
        c.dot ? (
          <circle
            key={`dot-${iso}`}
            cx={c.dot[0]}
            cy={c.dot[1]}
            r={3.2}
            data-iso={iso}
            className={["atlas-country cursor-pointer stroke-paper [stroke-width:0.8]", discovered.has(iso) ? "fill-success" : "fill-[#b3a78f]"].join(" ")}
          />
        ) : null,
      )}
    </svg>
  );
}
