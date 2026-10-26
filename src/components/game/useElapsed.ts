"use client";

import { useEffect, useState } from "react";

/** Display-only stopwatch driven by performance.now() (monotonic). Never used for scoring. */
export function useElapsed(startPerf: number | null, running: boolean): number {
  const [now, setNow] = useState(() => (typeof performance === "undefined" ? 0 : performance.now()));
  useEffect(() => {
    if (!running || startPerf === null) return;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [running, startPerf]);
  return startPerf === null ? 0 : Math.max(0, now - startPerf);
}
