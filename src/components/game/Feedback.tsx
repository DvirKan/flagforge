"use client";

import { Check, X } from "lucide-react";
import { forwardRef } from "react";
import type { AnswerResult } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";
import { continentKey } from "./continent";

/**
 * The verdict and the fact after each answer.
 *
 * Phones (below md): a sheet fixed to the bottom of the screen, tinted by the verdict, sliding up (transform
 * only). The page itself never scrolls, so the question number, timer and flag stay where they were — earlier
 * the panel was appended below the options and the browser scrolled down to reach the "next" button.
 * md and up: the same content in the answer column, where there is room for it.
 */
export const Feedback = forwardRef<HTMLButtonElement, { result: AnswerResult; isLast: boolean; onNext: () => void }>(
  function Feedback({ result, isLast, onNext }, nextRef) {
    const { locale, t } = useI18n();
    const c = result.country;
    const ok = result.correct;
    return (
      <section
        aria-live="polite"
        className={[
          // phone: bottom sheet
          "animate-sheet-up fixed inset-x-0 bottom-0 z-40 max-h-[62dvh] overflow-y-auto rounded-t-2xl border-t-4 px-4 pt-4 shadow-lift",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          ok ? "border-success bg-[#e9f2ea]" : "border-danger bg-[#f8e7e1]",
          // md+: inline panel, as before
          "md:static md:z-auto md:mt-6 md:max-h-none md:animate-none md:overflow-visible md:rounded-none md:border-t md:border-ink md:bg-transparent md:px-0 md:pb-0 md:pt-5 md:shadow-none",
        ].join(" ")}
      >
        <div className="mx-auto max-w-xl md:max-w-none">
          <p className={["flex items-center gap-1.5 text-sm font-semibold md:font-medium", ok ? "text-success" : "text-danger"].join(" ")}>
            {ok ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : <X aria-hidden="true" className="size-4" strokeWidth={3} />}
            {ok ? t("game.correct") : t("game.incorrect")}
          </p>
          <h2 className="display mt-1 text-2xl md:mt-2 md:text-4xl">{ok ? c.name[locale] : t("game.answerWas", { country: c.name[locale] })}</h2>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm md:mt-4 md:grid md:grid-cols-2 md:gap-4 md:border-y md:border-rule md:py-3">
            <div className="flex gap-1.5 md:block">
              <dt className="text-muted md:text-[0.8125rem] md:font-medium">{t("game.capital")}<span className="md:hidden">:</span></dt>
              <dd className="md:mt-1">{c.capital[locale]}</dd>
            </div>
            <div className="flex gap-1.5 md:block">
              <dt className="text-muted md:text-[0.8125rem] md:font-medium">{t("game.continent")}<span className="md:hidden">:</span></dt>
              <dd className="md:mt-1">{t(continentKey[c.continent])}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft md:mt-4 md:text-base">{c.fact[locale]}</p>
          <button ref={nextRef} type="button" onClick={onNext} className="btn btn-primary mt-4 w-full md:mt-6 md:w-auto">
            {isLast ? t("game.finish") : t("game.next")}
          </button>
        </div>
      </section>
    );
  },
);
