"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { splitDuration } from "@/lib/time/zoned";

/**
 * Live countdown to the next daily boundary.
 * The target instant is computed on the server (DST-aware, Asia/Jerusalem midnight). The client corrects
 * for its own clock skew using the server's "now", then ticks with performance.now() (monotonic).
 * When the boundary passes, the page is refreshed so the new challenge state is fetched from the server.
 */
export function Countdown({ targetIso, serverNowIso }: { targetIso: string; serverNowIso: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const anchor = useRef<{ serverNow: number; perf: number } | null>(null);
  const [remaining, setRemaining] = useState(() => Date.parse(targetIso) - Date.parse(serverNowIso));
  const refreshed = useRef(false);

  useEffect(() => {
    anchor.current = { serverNow: Date.parse(serverNowIso), perf: performance.now() };
    const target = Date.parse(targetIso);
    const tick = () => {
      const a = anchor.current;
      if (!a) return;
      const now = a.serverNow + (performance.now() - a.perf);
      const left = target - now;
      setRemaining(left);
      if (left <= 0 && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [targetIso, serverNowIso, router]);

  const { hours, minutes, seconds } = splitDuration(remaining);
  const units = [
    { value: hours, label: t("countdown.hours") },
    { value: minutes, label: t("countdown.minutes") },
    { value: seconds, label: t("countdown.seconds") },
  ];

  return (
    <div>
      <p className="text-sm text-muted">{t("countdown.label")}</p>
      {/* Visual clock is hidden from screen readers (it changes every second); a coarse label is announced instead. */}
      <div className="mt-1 flex items-start gap-1 font-mono text-3xl text-ink tabular md:text-4xl" dir="ltr" aria-hidden="true">
        {units.map((u, i) => (
          <span key={u.label} className="flex items-start">
            {i > 0 ? <span className="px-0.5 text-rule-strong">:</span> : null}
            <span className="flex flex-col items-center">
              <span>{String(u.value).padStart(2, "0")}</span>
              <span className="mt-1 font-sans text-[0.625rem] uppercase tracking-[0.12em] text-muted">{u.label}</span>
            </span>
          </span>
        ))}
      </div>
      <p className="sr-only">
        {t("countdown.label")} {hours} {t("countdown.hours")} {minutes} {t("countdown.minutes")}
      </p>
      <p className="mt-2 text-xs text-muted">{t("countdown.boundary")}</p>
    </div>
  );
}
