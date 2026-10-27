import { z } from "zod";
import { DIFFICULTIES } from "@/config/game";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { startPersistedGame } from "@/server/game/persisted";
import { supabaseRpc, RpcError } from "@/server/game/rpc";
import { startStandardGame } from "@/server/game/standard";
import { apiError, apiOk, limitOrError, parseJson } from "@/server/http";

export const runtime = "nodejs";

const Body = z.object({ difficulty: z.enum(DIFFICULTIES) }).strict();

/**
 * POST /api/game/start — begins a standard game. Signed-in players get a database-backed session (results
 * are saved); guests get a stateless encrypted session (nothing is saved). The response contains the first
 * question only, never the answers.
 */
export async function POST(req: Request) {
  const limited = limitOrError(req, "game-start", 30, 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, Body);
  if ("error" in parsed) return parsed.error;
  try {
    const userId = isAdminClientConfigured() ? await getVerifiedUserId() : null;
    if (userId) {
      return apiOk({ ...(await startPersistedGame(supabaseRpc(createSupabaseAdminClient()), userId, parsed.data.difficulty)), persisted: true });
    }
    return apiOk({ ...startStandardGame(parsed.data.difficulty), persisted: false });
  } catch (err) {
    if (err instanceof RpcError && /rate_limited/.test(err.message)) return apiError("rate_limited", 429, { "Retry-After": "600" });
    console.error("[game/start] failed", err instanceof Error ? err.message : "unknown");
    return apiError("internal", 500);
  }
}
