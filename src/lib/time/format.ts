/** Formats a duration as m:ss (or m:ss.t with tenths). Hours roll into minutes (e.g. 75:04). */
export function formatDuration(ms: number, opts: { tenths?: boolean } = {}): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const base = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return opts.tenths ? `${base}.${Math.floor((safe % 1000) / 100)}` : base;
}
