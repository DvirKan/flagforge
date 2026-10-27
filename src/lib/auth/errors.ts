import type { MessageKey } from "@/lib/i18n/translate";

/** Maps Supabase Auth error codes to user-facing messages without revealing account existence. */
export function authErrorKey(error: { code?: string; status?: number } | null | undefined): MessageKey {
  switch (error?.code) {
    case "invalid_credentials":
      return "authErrors.invalidCredentials";
    case "email_not_confirmed":
      return "authErrors.emailNotConfirmed";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "authErrors.rateLimited";
    case "weak_password":
      return "authErrors.weakPassword";
    case "same_password":
      return "authErrors.samePassword";
    case "session_not_found":
    case "session_expired":
      return "authErrors.sessionMissing";
    case "email_address_invalid":
      return "authErrors.invalidEmail";
    default:
      if (error?.status === 429) return "authErrors.rateLimited";
      // Unexpected: log the code/status only (never credentials or emails).
      console.error("[auth] unexpected error", error?.code ?? "no-code", error?.status ?? "no-status");
      return "authErrors.generic";
  }
}
