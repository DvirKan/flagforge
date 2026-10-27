/**
 * Decorative hero illustration: a loose, hand-placed fan of real flags. Purely ornamental (aria-hidden) and
 * independent of the daily challenge, so it never hints at today's answers.
 */
const CARDS = [
  { iso: "br", rotate: -9, x: "4%", y: "18%", z: 1, w: "46%" },
  { iso: "jp", rotate: 6, x: "48%", y: "4%", z: 2, w: "42%" },
  { iso: "ke", rotate: -3, x: "26%", y: "40%", z: 4, w: "48%" },
  { iso: "se", rotate: 11, x: "56%", y: "46%", z: 3, w: "38%" },
  { iso: "za", rotate: -14, x: "0%", y: "60%", z: 2, w: "36%" },
];

export function FlagFan() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-[18rem] select-none sm:max-w-sm lg:max-w-md">
      {CARDS.map((c) => (
        <div
          key={c.iso}
          className="absolute rounded-lg bg-paper p-1.5 shadow-lift transition-transform duration-300 ease-out [transform:rotate(var(--r))] hover:[transform:rotate(0deg)_translateY(-6px)]"
          style={{ insetInlineStart: c.x, top: c.y, width: c.w, zIndex: c.z, ["--r" as string]: `${c.rotate}deg` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static same-origin SVG */}
          <img src={`/api/flags/${c.iso}`} alt="" className="block aspect-[4/3] w-full rounded-md object-cover" draggable={false} />
        </div>
      ))}
    </div>
  );
}
