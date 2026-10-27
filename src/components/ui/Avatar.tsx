/** Initials avatar with a stable colour per username (flag-inspired, softened palette). */
const PALETTE = [
  ["#c8553d", "#fff7f0"], // red
  ["#2f5d8a", "#f2f7fc"], // blue
  ["#2f7a55", "#f1faf4"], // green
  ["#e0a526", "#2a1f05"], // yellow
  ["#7a4e9c", "#f7f2fb"], // purple
  ["#d9732f", "#fff6ee"], // orange
  ["#1f6f78", "#eefafb"], // teal
] as const;

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

export function Avatar({ name, seed, size = 36 }: { name: string; seed: string; size?: number }) {
  const [bg, fg] = PALETTE[hash(seed) % PALETTE.length] ?? PALETTE[0];
  const initials = Array.from(name.trim()).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
