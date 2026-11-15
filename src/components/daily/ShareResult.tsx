"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { dailyShareText } from "@/lib/daily/share";
import { useI18n } from "@/lib/i18n/client";

type State = "idle" | "copied" | "manual";

/**
 * Shares the daily result. Uses the system share sheet where there is one (phones: WhatsApp, Instagram…),
 * otherwise copies the text; if the clipboard is unavailable too, shows the text to copy by hand.
 */
export function ShareResult({ date, results, elapsedMs }: { date: string; results: boolean[]; elapsedMs: number }) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<State>("idle");
  const [text, setText] = useState("");

  async function share() {
    const value = dailyShareText({ date, results, elapsedMs, url: `${window.location.origin}/daily?lang=${locale}`, copy: { label: t("daily.shareLabel"), dareFaster: t("daily.shareDareFaster"), dareBetter: t("daily.shareDareBetter") } });
    setText(value);
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ text: value });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // the player closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("manual");
    }
  }

  return (
    <div>
      <button type="button" onClick={share} className="btn btn-accent">
        {state === "copied" ? <Check aria-hidden="true" className="size-4" /> : <Share2 aria-hidden="true" className="size-4" />}
        {state === "copied" ? t("daily.shareCopied") : t("daily.share")}
      </button>
      <p role="status" className="sr-only">
        {state === "copied" ? t("daily.shareCopied") : ""}
      </p>
      {state === "manual" ? (
        <label className="mt-3 block text-sm">
          <span className="text-muted">{t("daily.shareManual")}</span>
          <textarea readOnly value={text} rows={4} dir="ltr" className="field-input mt-1 py-2 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        </label>
      ) : null}
    </div>
  );
}
