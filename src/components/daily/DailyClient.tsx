"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlagPlate } from "@/components/game/FlagPlate";
import { OptionList } from "@/components/game/OptionList";
import { ProgressTicks } from "@/components/game/ProgressTicks";
import type { AnswerResult, QuestionView } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/time/format";
import type { DailyResult, DailyStart } from "@/server/daily/service";
import { DailyResultView } from "./DailyResultView";

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | {
      kind: "playing";
      token: string;
      question: QuestionView;
      results: boolean[];
      chosen: number | null;
      reveal: AnswerResult | null;
      pending: boolean;
    }
  | { kind: "complete"; result: DailyResult };

/** How long the right/wrong feedback stays before the next flag (identical for every player). */
const FEEDBACK_MS = 900;

/**
 * Ranked daily attempt. The clock shown here is for display only (server-anchored, monotonic); the official
 * time comes from the database. A refresh resumes the same attempt — the clock keeps running.
 */
export function DailyClient() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const clock = useRef<{ startedAt: number; serverNow: number; perf: number } | null>(null);
  const [now, setNow] = useState(0);
  const firstOption = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const begin = useCallback(async () => {
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/daily/start", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as DailyStart;
      if (data.kind === "completed") {
        setPhase({ kind: "complete", result: data.result });
        router.refresh();
        return;
      }
      clock.current = { startedAt: Date.parse(data.startedAt), serverNow: Date.parse(data.serverNow), perf: performance.now() };
      setPhase({ kind: "playing", token: data.token, question: data.question, results: Array.from({ length: data.answered }, () => false), chosen: null, reveal: null, pending: false });
    } catch {
      setPhase({ kind: "error" });
    }
  }, [router]);

  // Start (or resume) on arrival. Starting is idempotent on the server, so a double effect is harmless.
  useEffect(() => {
    void begin();
  }, [begin]);

  // Display clock.
  useEffect(() => {
    if (phase.kind !== "playing") return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [phase.kind]);
  const elapsed = clock.current ? Math.max(0, clock.current.serverNow + (now - clock.current.perf) - clock.current.startedAt) : 0;

  const choose = useCallback(
    async (index: number) => {
      if (phase.kind !== "playing" || phase.chosen !== null) return;
      const current = phase;
      setPhase({ ...current, chosen: index, pending: true });
      try {
        const res = await fetch("/api/daily/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: current.token, choice: index }),
          cache: "no-store",
        });
        if (res.status === 409) {
          // Already answered elsewhere (another tab): reload the authoritative state.
          await begin();
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { token: string | null; result: AnswerResult; next: QuestionView | null; final: DailyResult | null };
        setPhase({ ...current, chosen: index, pending: false, reveal: data.result, results: [...current.results, data.result.correct] });
        window.setTimeout(() => {
          if (data.final) {
            setPhase({ kind: "complete", result: data.final });
            router.refresh();
          } else if (data.next && data.token) {
            setPhase({ kind: "playing", token: data.token, question: data.next, results: [...current.results, data.result.correct], chosen: null, reveal: null, pending: false });
          }
        }, FEEDBACK_MS);
      } catch {
        setPhase({ ...current, chosen: null, pending: false });
      }
    },
    [phase, begin, router],
  );

  useEffect(() => {
    if (phase.kind === "playing" && phase.chosen === null) firstOption.current?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    if (phase.kind === "complete") resultHeading.current?.focus();
  }, [phase.kind]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase.kind !== "playing" || phase.chosen !== null || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        void choose(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, choose]);

  if (phase.kind === "idle" || phase.kind === "error") {
    return (
      <div>
        {phase.kind === "error" ? (
          <p role="alert" className="mb-4 border-s-2 border-danger ps-3 text-sm">
            {t("daily.errorStart")}
          </p>
        ) : null}
        <button type="button" className="btn btn-accent w-full sm:w-auto" onClick={() => void begin()}>
          {t("game.retry")}
        </button>
      </div>
    );
  }
  if (phase.kind === "loading") {
    return (
      <p role="status" className="eyebrow py-6">
        {t("daily.starting")}
      </p>
    );
  }
  if (phase.kind === "complete") {
    return (
      <div className="grid gap-6">
        <DailyResultView ref={resultHeading} result={phase.result} />
        <Link href="/daily" className="btn btn-primary justify-self-start">
          {t("daily.leaderboardTitle")}
        </Link>
      </div>
    );
  }

  const { question, reveal } = phase;
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <p className="eyebrow tabular">{t("game.question", { current: question.index + 1, total: question.total })}</p>
        <p className="font-mono text-lg tabular" dir="ltr" aria-label={`${t("game.elapsed")} ${formatDuration(elapsed)}`}>
          {formatDuration(elapsed, { tenths: true })}
        </p>
      </div>
      <ProgressTicks total={question.total} results={phase.results} current={question.index} />
      <div className="mt-4 grid gap-4 md:gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <FlagPlate key={question.flagUrl} src={question.flagUrl} figure={`${question.index + 1} / ${question.total}`} revealedName={reveal ? reveal.country.name[locale] : undefined} />
        </div>
        <div className="lg:col-span-5">
          <OptionList ref={firstOption} options={question.options} state={{ chosen: phase.chosen, correct: reveal ? reveal.correctIndex : null, pending: phase.pending }} onChoose={(i) => void choose(i)} />
          {reveal ? (
            <p aria-live="polite" className={["mt-4 font-medium", reveal.correct ? "text-success" : "text-danger"].join(" ")}>
              {reveal.correct ? t("game.correct") : t("game.answerWas", { country: reveal.country.name[locale] })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
