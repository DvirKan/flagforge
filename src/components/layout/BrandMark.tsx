/** Original brand mark: a flag-proportioned plate crossed by a meridian, with a rust waypoint. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="34.5" height="22.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 0.75 C 16 8, 16 16, 12 23.25" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M0.75 12 H 35.25" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.5 1.5" />
      <circle cx="25" cy="8" r="2.75" fill="var(--color-rust)" />
    </svg>
  );
}
