import { getVerifiedUserId } from "@/lib/auth/session";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { startDaily } from "@/server/daily/service";
import { supabaseRpc } from "@/server/game/rpc";
import { apiError, apiOk, limitOrError } from "@/server/http";

export const runtime = "nodejs";

/**
 * POST /api/daily/start — starts (or resumes) the signed-in user's single attempt at today's challenge.
 * Requires authentication. Never returns answers for unanswered questions.
 */
export async function POST(req: Request) {
  const limited = limitOrError(req, "daily-start", 20, 60_000);
  if (limited) return limited;
  if (!isAdminClientConfigured()) return apiError("internal", 503);
  const userId = await getVerifiedUserId();
  if (!userId) return apiError("session_invalid", 401);
  try {
    const out = await startDaily(supabaseRpc(createSupabaseAdminClient()), userId);
    if ("error" in out) return apiError("conflict", 404);
    return apiOk(out);
  } catch (err) {
    console.error("[daily/start] failed", err instanceof Error ? err.message : "unknown");
    return apiError("internal", 500);
  }
}
