"use client";

import { forwardRef } from "react";
import type { AnswerResult } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";
import { continentKey } from "./continent";

export const Feedback = forwardRef<HTMLButtonElement, { result: AnswerResult; isLast: boolean; onNext: () => void }>(
  function Feedback({ result, isLast, onNext }, nextRef) {
    const { locale, t } = useI18n();
    const c = result.country;
    return (
      <section aria-live="polite" className="mt-6 border-t border-ink pt-5">
        <p className={["eyebrow", result.correct ? "!text-success" : "!text-danger"].join(" ")}>
          {result.correct ? t("game.correct") : t("game.incorrect")}
        </p>
        <h2 className="display mt-2 text-3xl md:text-4xl">
          {result.correct ? c.name[locale] : t("game.answerWas", { country: c.name[locale] })}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-rule py-3 text-sm">
          <div>
            <dt className="eyebrow">{t("game.capital")}</dt>
            <dd className="mt-1">{c.capital[locale]}</dd>
          </div>
          <div>
            <dt className="eyebrow">{t("game.continent")}</dt>
            <dd className="mt-1">{t(continentKey[c.continent])}</dd>
          </div>
        </dl>
        <p className="mt-4 text-ink-soft">{c.fact[locale]}</p>
        <button ref={nextRef} type="button" onClick={onNext} className="btn btn-primary mt-6 w-full sm:w-auto">
          {isLast ? t("game.finish") : t("game.next")}
        </button>
      </section>
    );
  },
);
