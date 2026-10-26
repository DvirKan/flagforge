export function PreviewNotice({ text }: { text: string }) {
  return (
    <p role="note" className="mb-6 border-s-2 border-rust bg-parchment px-3 py-2 text-sm text-ink-soft">
      {text}
    </p>
  );
}
