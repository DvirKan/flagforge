/** A labelled, disabled input used while accounts are not yet wired up (Phase 3 replaces these with live forms). */
export function DisabledField({ id, label, type = "text", autoComplete }: { id: string; label: string; type?: string; autoComplete?: string }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input id={id} name={id} type={type} autoComplete={autoComplete} className="field-input" disabled />
    </div>
  );
}
