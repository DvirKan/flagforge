/**
 * Builds the personal-atlas map: src/data/atlas.json — pre-projected SVG path data for every UN member state.
 *
 * Source: world-atlas (Natural Earth admin-0 countries, public domain; package ISC). Shapes come from the
 * 1:110m file to keep the page light; members too small to appear there (or too small to see) get a dot at
 * their centroid taken from the 1:50m file (1:10m for Tuvalu). Features that are not UN members (Greenland, Western Sahara,
 * Taiwan, Kosovo, Palestine, Antarctica excluded…) are drawn as neutral background land.
 *
 * Usage:  npm run data:atlas
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { UN_MEMBER_CODES } from "./lib/un-members";

const root = join(__dirname, "..");
const load = (name: string) => JSON.parse(readFileSync(join(root, "node_modules", "world-atlas", name), "utf8")) as Topology<{ countries: GeometryCollection }>;

const WIDTH = 1000;
const HEIGHT = 520;
const MIN_AREA = 9; // px² — below this a shape is invisible at the default size; show a dot as well

type Feature = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;
const featuresOf = (topo: Topology<{ countries: GeometryCollection }>) =>
  (feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>).features;

// Natural Earth gives some territories their own numeric ids; others (Kosovo, N. Cyprus, Somaliland) have none.
function isoOf(f: Feature): string | null {
  if (f.id === undefined || f.id === "-99") return null;
  return countries.numericToAlpha2(String(f.id).padStart(3, "0")) ?? null;
}

const coarse = featuresOf(load("countries-110m.json")).filter((f) => isoOf(f) !== "AQ");
const fine = featuresOf(load("countries-50m.json"));
const finest = featuresOf(load("countries-10m.json")); // Tuvalu only exists at 1:10m

const projection = geoNaturalEarth1().fitExtent(
  [
    [4, 4],
    [WIDTH - 4, HEIGHT - 4],
  ],
  { type: "FeatureCollection", features: coarse } as GeoPermissibleObjects,
);
const path = geoPath(projection).digits(1);

const out: Record<string, { d?: string; dot?: [number, number] }> = {};
const background: string[] = [];

for (const f of coarse) {
  const iso = isoOf(f);
  const d = path(f);
  if (!d) continue;
  if (iso && UN_MEMBER_CODES.has(iso)) {
    const entry: { d?: string; dot?: [number, number] } = { d };
    if (path.area(f) < MIN_AREA) entry.dot = path.centroid(f).map((n) => Math.round(n * 10) / 10) as [number, number];
    out[iso] = entry;
  } else {
    background.push(d);
  }
}

const missing: string[] = [];
for (const iso of UN_MEMBER_CODES) {
  if (out[iso]) continue;
  const f = fine.find((x) => isoOf(x) === iso) ?? finest.find((x) => isoOf(x) === iso);
  if (!f) {
    missing.push(iso);
    continue;
  }
  out[iso] = { dot: path.centroid(f).map((n) => Math.round(n * 10) / 10) as [number, number] };
}

if (missing.length) {
  console.error(`No geometry for: ${missing.join(", ")}`);
  process.exit(1);
}

const atlas = {
  source: "Natural Earth via world-atlas 2.0.2 (1:110m shapes, 1:50m / 1:10m centroids), Natural Earth I projection",
  width: WIDTH,
  height: HEIGHT,
  background: background.join(""),
  countries: Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))),
};
const file = join(root, "src", "data", "atlas.json");
writeFileSync(file, JSON.stringify(atlas));
const dots = Object.values(out).filter((c) => c.dot).length;
console.log(`atlas.json: ${Object.keys(out).length} members (${dots} with dots), ${(JSON.stringify(atlas).length / 1024).toFixed(0)} KB`);
