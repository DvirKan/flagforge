/** Random source returning a float in [0, 1). Injected so selection logic is deterministic under test. */
export type Rng = () => number;

/** Cryptographically strong RNG for production (unbiased enough for selection; avoids Math.random predictability). */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  return () => {
    globalThis.crypto.getRandomValues(buf);
    return (buf[0] ?? 0) / 2 ** 32;
  };
}

/** Small deterministic PRNG (mulberry32) for tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Weighted sampling without replacement. Items with weight ≤ 0 are never chosen. */
export function weightedSample<T>(items: readonly T[], weight: (item: T) => number, count: number, rng: Rng): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(0, weight(item)) })).filter((e) => e.w > 0);
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((s, e) => s + e.w, 0);
    let r = rng() * total;
    let idx = pool.findIndex((e) => (r -= e.w) < 0);
    if (idx < 0) idx = pool.length - 1;
    chosen.push((pool[idx] as { item: T }).item);
    pool.splice(idx, 1);
  }
  return chosen;
}
