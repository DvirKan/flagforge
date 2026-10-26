"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Difficulty } from "@/config/game";
import type { AnswerResult, GameSummary, QuestionView } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/time/format";
import { startGame, submitAnswer, type ApiFailure } from "./api";
import { Feedback } from "./Feedback";
import { FlagPlate } from "./FlagPlate";
import { OptionList } from "./OptionList";
import { ProgressTicks } from "./ProgressTicks";
import { Results } from "./Results";
import { useElapsed } from "./useElapsed";

type State =
  | { phase: "loading" }
  | { phase: "error"; failure: ApiFailure; during: "start" }
  | {
      phase: "playing";
      token: string;
      question: QuestionView;
      chosen: number | null;
      pending: boolean;
      answerError: ApiFailure | null;
      reveal: { result: AnswerResult; nextToken: string | null; next: QuestionView | null; summary: GameSummary | null } | null;
      results: boolean[];
      startPerf: number;
    }
  | { phase: "complete"; summary: GameSummary };

type Action =
  | { type: "start" }
  | { type: "started"; token: string; question: QuestionView }
  | { type: "startFailed"; failure: ApiFailure }
  | { type: "choose"; index: number }
  | { type: "answered"; result: AnswerResult; nextToken: string | null; next: QuestionView | null; summary: GameSummary | null }
  | { type: "answerFailed"; failure: ApiFailure }
  | { type: "advance" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { phase: "loading" };
    case "started":
      return {
        phase: "playing",
        token: action.token,
        question: action.question,
        chosen: null,
        pending: false,
        answerError: null,
        reveal: null,
        results: [],
        startPerf: performance.now(),
      };
    case "startFailed":
      return { phase: "error", failure: action.failure, during: "start" };
    case "choose":
      if (state.phase !== "playing" || state.chosen !== null) return state;
      return { ...state, chosen: action.index, pending: true, answerError: null };
    case "answered":
      if (state.phase !== "playing") return state;
      return {
        ...state,
        pending: false,
        reveal: { result: action.result, nextToken: action.nextToken, next: action.next, summary: action.summary },
        results: [...state.results, action.result.correct],
      };
    case "answerFailed":
      // Let the player retry the same question: the token was not advanced.
      if (state.phase !== "playing") return state;
      return { ...state, chosen: null, pending: false, answerError: action.failure };
    case "advance": {
      if (state.phase !== "playing" || !state.reveal) return state;
      const { summary, next, nextToken } = state.reveal;
      if (summary) return { phase: "complete", summary };
      if (!next || !nextToken) return state;
      return { ...state, token: nextToken, question: next, chosen: null, reveal: null, answerError: null };
    }
  }
}

const FAILURE_KEY = {
  expired: "game.expired",
  rate_limited: "game.rateLimited",
  network: "game.errorAnswer",
  invalid: "game.errorAnswer",
} as const;

export function GameClient({ difficulty }: { difficulty: Difficulty }) {
  const { locale, t } = useI18n();
  const [state, dispatch] = useReducer(reducer, { phase: "loading" });
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const [generation, bump] = useReducer((n: number) => n + 1, 0);

  // Start (and restart) a game. AbortController handles React Strict Mode's double effect in development.
  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: "start" });
    startGame(difficulty, controller.signal)
      .then((res) => {
        if (res.ok) dispatch({ type: "started", token: res.data.token, question: res.data.question });
        else dispatch({ type: "startFailed", failure: res.failure });
      })
      .catch(() => undefined); // aborted
    return () => controller.abort();
  }, [difficulty, generation]);

  const choose = useCallback(
    async (index: number) => {
      if (state.phase !== "playing" || state.chosen !== null || state.pending) return;
      dispatch({ type: "choose", index });
      const res = await submitAnswer(state.token, index);
      if (res.ok) dispatch({ type: "answered", result: res.data.result, nextToken: res.data.token, next: res.data.next, summary: res.data.summary });
      else dispatch({ type: "answerFailed", failure: res.failure });
    },
    [state],
  );

  const revealed = state.phase === "playing" && state.reveal !== null;
  const questionIndex = state.phase === "playing" ? state.question.index : -1;

  // Focus management: options on a new question, "next" after a reveal, heading on completion.
  useEffect(() => {
    if (state.phase === "playing" && !revealed) firstOptionRef.current?.focus({ preventScroll: true });
  }, [state.phase, questionIndex, revealed]);
  useEffect(() => {
    // Without preventScroll, phones scroll just enough to bring the feedback's "next" button into view.
    if (revealed) nextRef.current?.focus();
  }, [revealed]);
  useEffect(() => {
    if (state.phase === "complete") {
      resultsRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
  }, [state.phase]);

  // Preload the next flag while the player reads the fact.
  useEffect(() => {
    if (state.phase === "playing" && state.reveal?.next) {
      const img = new Image();
      img.src = state.reveal.next.flagUrl;
    }
  }, [state]);

  // Keyboard: 1–4 choose, Enter/→ continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.phase !== "playing" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (!state.reveal && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        void choose(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, choose]);

  const running = state.phase === "playing";
  const elapsed = useElapsed(state.phase === "playing" ? state.startPerf : null, running);

  if (state.phase === "loading") {
    return (
      <div role="status" className="py-24 text-center">
        <p className="eyebrow">{t("game.starting")}</p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div role="alert" className="mx-auto max-w-lg py-20 text-center">
        <p className="display text-3xl">{t("game.errorStart")}</p>
        {state.failure === "rate_limited" ? <p className="mt-3 text-ink-soft">{t("game.rateLimited")}</p> : null}
        <button type="button" className="btn btn-primary mt-6" onClick={bump}>
          {t("game.retry")}
        </button>
      </div>
    );
  }

  if (state.phase === "complete") {
    return <Results ref={resultsRef} summary={state.summary} onPlayAgain={bump} />;
  }

  const { question, reveal } = state;
  const figure = `${String(question.index + 1).padStart(2, "0")} / ${String(question.total).padStart(2, "0")}`;

  return (
    <div className="pt-3 md:pt-10">
      <div className="mb-2 flex items-end justify-between gap-4 md:mb-5">
        <p className="eyebrow tabular">{t("game.question", { current: question.index + 1, total: question.total })}</p>
        <p className="eyebrow tabular" aria-label={`${t("game.elapsed")} ${formatDuration(elapsed)}`}>
          <span aria-hidden="true">
            {t("game.elapsed")} <span className="font-mono text-sm text-ink" dir="ltr">{formatDuration(elapsed)}</span>
          </span>
        </p>
      </div>
      <ProgressTicks total={question.total} results={state.results} current={question.index} />

      <div className="mt-3 grid gap-4 [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:gap-2 md:mt-6 md:gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <FlagPlate key={question.flagUrl} src={question.flagUrl} figure={figure} revealedName={reveal ? reveal.result.country.name[locale] : undefined} />
        </div>
        <div className="lg:col-span-5">
          <OptionList
            ref={firstOptionRef}
            options={question.options}
            state={{ chosen: state.chosen, correct: reveal ? reveal.result.correctIndex : null, pending: state.pending }}
            onChoose={(i) => void choose(i)}
          />
          {state.pending ? (
            <p role="status" className="mt-3 text-sm text-muted">
              {t("game.checking")}
            </p>
          ) : null}
          {state.answerError ? (
            <p role="alert" className="mt-3 border-s-2 border-danger ps-3 text-sm">
              {t(FAILURE_KEY[state.answerError])}
            </p>
          ) : null}
          {state.answerError === "expired" ? (
            <button type="button" className="btn btn-primary mt-3" onClick={bump}>
              {t("game.newGame")}
            </button>
          ) : null}
          {reveal ? (
            <Feedback ref={nextRef} result={reveal.result} isLast={reveal.summary !== null} onNext={() => dispatch({ type: "advance" })} />
          ) : (
            <p className="mt-4 hidden text-xs text-muted md:block">{t("game.keyboardHint")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
