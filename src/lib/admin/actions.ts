"use server";

import { revalidatePath } from "next/cache";
import { cryptoRng } from "@/lib/game/rng";
import { requireAdmin } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCalendarDate } from "@/lib/time/zoned";
import { deleteDraft, fillAhead, generateDraft, publish, replaceQuestion, unpublish, type Actor, type AdminError } from "@/server/admin/calendar";
import { selectionContext } from "@/server/countries";
import { todayChallengeDate } from "@/server/daily/queries";
import { supabaseRpc } from "@/server/game/rpc";

/**
 * Admin mutations. Each one re-checks the admin role on the server (requireAdmin → 404 for everyone else),
 * validates its input, delegates to the calendar service (which the database guards again) and logs.
 */
export type AdminActionState =
  | { status: "idle" }
  | { status: "ok"; report?: { published: number; skipped: number; failed: number } }
  | { status: "error"; error: AdminError | "past" | "generic"; problems?: string[] };

const INTENTS = ["generate", "replace", "publish", "unpublish", "delete"] as const;
type Intent = (typeof INTENTS)[number];

function validDate(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  try {
    parseCalendarDate(raw);
    return raw;
  } catch {
    return null;
  }
}

async function context() {
  const viewer = await requireAdmin();
  const actor: Actor = { id: viewer.id, source: "admin" };
  return { actor, rpc: supabaseRpc(createSupabaseAdminClient()) };
}

function logFailure(scope: string, details: Record<string, unknown>, err: unknown) {
  console.error(JSON.stringify({ level: "error", scope, ...details, message: err instanceof Error ? err.message : String(err), at: new Date().toISOString() }));
}

export async function dailyAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const { actor, rpc } = await context();
  const intent = INTENTS.find((i) => i === form.get("intent")) as Intent | undefined;
  const date = validDate(form.get("date"));
  if (!intent || !date) return { status: "error", error: "bad_request" };
  // Past dates are history: they can be viewed, never changed (the DB also refuses for published ones).
  if (date < todayChallengeDate()) return { status: "error", error: "past" };

  try {
    const rng = cryptoRng();
    let result;
    switch (intent) {
      case "generate":
        result = await generateDraft(rpc, selectionContext, rng, actor, date);
        break;
      case "replace": {
        const position = Number(form.get("position"));
        const iso = String(form.get("iso") ?? "");
        if (!Number.isInteger(position) || position < 1 || position > 5) return { status: "error", error: "bad_request" };
        result = await replaceQuestion(rpc, selectionContext, rng, actor, date, position, /^[A-Z]{2}$/.test(iso) ? iso : null);
        break;
      }
      case "publish":
        result = await publish(rpc, actor, date);
        break;
      case "unpublish":
        result = await unpublish(rpc, actor, date);
        break;
      case "delete":
        result = await deleteDraft(rpc, actor, date);
        break;
    }
    revalidatePath("/admin");
    revalidatePath(`/admin/daily/${date}`);
    if (date === todayChallengeDate()) revalidatePath("/");
    return result.ok ? { status: "ok" } : { status: "error", error: result.error, problems: result.problems };
  } catch (err) {
    logFailure("admin.daily", { intent, date, actor: actor.id }, err);
    return { status: "error", error: "generic" };
  }
}

export async function fillAheadAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const { actor, rpc } = await context();
  const days = Number(form.get("days"));
  if (![7, 14, 30, 60].includes(days)) return { status: "error", error: "bad_request" };
  try {
    const report = await fillAhead(rpc, selectionContext, cryptoRng(), actor, todayChallengeDate(), days);
    if (report.failed.length) logFailure("admin.fill_ahead", { failed: report.failed }, new Error("some dates failed"));
    revalidatePath("/admin");
    revalidatePath("/");
    return { status: "ok", report: { published: report.published.length, skipped: report.skipped.length, failed: report.failed.length } };
  } catch (err) {
    logFailure("admin.fill_ahead", { days, actor: actor.id }, err);
    return { status: "error", error: "generic" };
  }
}
