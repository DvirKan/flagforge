"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * The flag, presented as a mounted atlas plate. All game flags share a 4:3 canvas (flag-icons artwork), shown
 * uncropped with object-contain. The URL is opaque; alt text is generic until the answer is revealed.
 */
export function FlagPlate({ src, revealedName }: { src: string; revealedName?: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  return (
    <figure className="relative mx-auto w-full max-w-[calc(28dvh*4/3+1rem)] [@media(max-height:640px)]:max-w-[calc(19dvh*4/3+1rem)] lg:max-w-none">
      <div className="relative rounded-sm border border-rule bg-paper p-2 sm:p-4">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-parchment-deep">
          {state !== "error" ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic, opaque same-origin SVG; next/image adds nothing here
            <img
              key={`${src}#${attempt}`}
              src={src}
              alt={revealedName ? t("game.flagAltRevealed", { country: revealedName }) : t("game.flagAlt")}
              className={[
                "absolute inset-0 size-full object-contain transition-opacity duration-300",
                state === "ready" ? "opacity-100" : "opacity-0",
              ].join(" ")}
              draggable={false}
              onLoad={() => setState("ready")}
              onError={() => setState("error")}
            />
          ) : (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-sm text-ink-soft">{t("game.flagUnavailable")}</p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setAttempt((n) => n + 1);
                  setState("loading");
                }}
              >
                {t("game.reloadFlag")}
              </button>
            </div>
          )}
          {state === "loading" ? <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-parchment-deep" /> : null}
        </div>
      </div>
    </figure>
  );
}
