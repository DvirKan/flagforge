import type { MessageKey } from "@/lib/i18n/translate";

export interface FormState {
  status: "idle" | "error" | "success";
  /** form-level message (i18n key) */
  message?: MessageKey;
  /** field → i18n key */
  fields?: Record<string, MessageKey>;
  /** echoed non-secret values so inputs keep their content after a server round trip */
  values?: Record<string, string>;
}

export const initialFormState: FormState = { status: "idle" };
