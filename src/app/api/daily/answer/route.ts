import { z } from "zod";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { answerDaily } from "@/server/daily/service";
import { supabaseRpc } from "@/server/game/rpc";
import { apiError, apiOk, limitOrError, parseJson } from "@/server/http";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(16).max(4096), choice: z.number().int().min(0).max(3) }).strict();

/** POST /api/daily/answer — the database validates the answer, records it once, and times the attempt. */
export async function POST(req: Request) {
  const limited = limitOrError(req, "daily-answer", 60, 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, Body);
  if ("error" in parsed) return parsed.error;
  if (!isAdminClientConfigured()) return apiError("internal", 503);
  const userId = await getVerifiedUserId();
  if (!userId) return apiError("session_invalid", 401);
  try {
    const out = await answerDaily(supabaseRpc(createSupabaseAdminClient()), userId, parsed.data.token, parsed.data.choice);
    if ("error" in out) return apiError(out.error === "conflict" ? "conflict" : "session_invalid", out.error === "conflict" ? 409 : 400);
    return apiOk(out);
  } catch (err) {
    console.error("[daily/answer] failed", err instanceof Error ? err.message : "unknown");
    return apiError("internal", 500);
  }
}
