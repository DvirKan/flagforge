import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { DIFFICULTIES } from "@/config/game";
import { getI18n } from "@/lib/i18n/server";

/** Difficulty choices presented as an atlas index (rows, not cards). */
export async function DifficultyIndex({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const { t } = await getI18n();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ol className="border-t border-rule">
      {DIFFICULTIES.map((d) => (
        <li key={d} className="border-b border-rule">
          <Link
            href={`/play/${d}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-5 transition-colors hover:bg-paper/70 md:grid-cols-[12rem_minmax(0,1fr)_auto] md:gap-6 md:px-2"
          >
            <Heading className="display text-2xl md:text-3xl">{t(`difficulty.${d}`)}</Heading>
            <p className="col-span-2 row-start-2 text-ink-soft md:col-span-1 md:col-start-2 md:row-start-1">
              {t(`difficulty.${d}Blurb`)}
            </p>
            <ArrowUpRight
              className="size-5 text-ink transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
              strokeWidth={1.5}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
