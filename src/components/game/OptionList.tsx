"use client";

import { Check, X } from "lucide-react";
import { forwardRef } from "react";
import type { Localized } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";

export interface OptionState {
  chosen: number | null;
  correct: number | null; // known only after the server answers
  pending: boolean;
}

/** Four large answer buttons. Disabled once an answer is submitted; colours never carry meaning alone (icons too). */
export const OptionList = forwardRef<HTMLButtonElement, { options: { name: Localized }[]; state: OptionState; onChoose: (i: number) => void }>(
  function OptionList({ options, state, onChoose }, firstRef) {
    const { locale, t } = useI18n();
    const answered = state.chosen !== null;
    return (
      <fieldset>
        <legend className="display mb-3 text-lg md:mb-4 md:text-2xl [@media(max-height:640px)]:sr-only">{t("game.prompt")}</legend>
        <ol className="grid gap-2 md:gap-2.5">
          {options.map((opt, i) => {
            const isCorrect = state.correct === i;
            const isWrongChoice = state.correct !== null && state.chosen === i && !isCorrect;
            const dim = state.correct !== null && !isCorrect && !isWrongChoice;
            return (
              <li key={i}>
                <button
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  disabled={answered}
                  aria-pressed={state.chosen === i}
                  onClick={() => onChoose(i)}
                  className={[
                    "group grid min-h-12 [@media(max-height:640px)]:min-h-11 [@media(max-height:640px)]:py-2 w-full grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 border px-4 py-2.5 text-start text-base transition-colors md:min-h-14 md:grid-cols-[2rem_minmax(0,1fr)_1.5rem] md:py-3 md:text-[1.0625rem]",
                    isCorrect
                      ? "border-success bg-success-wash text-ink"
                      : isWrongChoice
                        ? "border-danger bg-danger-wash text-ink"
                        : state.chosen === i
                          ? "border-ink bg-paper"
                          : "border-ink/30 bg-paper/70 enabled:hover:border-ink enabled:hover:bg-paper",
                    dim ? "opacity-55" : "",
                    answered ? "cursor-default" : "",
                  ].join(" ")}
                >
                  <span className="font-mono text-sm text-muted tabular" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{opt.name[locale]}</span>
                  <span aria-hidden="true" className="justify-self-end">
                    {isCorrect ? <Check className="size-5 text-success" /> : isWrongChoice ? <X className="size-5 text-danger" /> : null}
                  </span>
                  {isCorrect ? <span className="sr-only">{t("game.correct")}</span> : null}
                  {isWrongChoice ? <span className="sr-only">{t("game.incorrect")}</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </fieldset>
    );
  },
);
