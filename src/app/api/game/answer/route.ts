import { z } from "zod";
import { apiError, apiOk, limitOrError, parseJson } from "@/server/http";
import { answerStandardGame } from "@/server/game/standard";

export const runtime = "nodejs";

const Body = z
  .object({
    token: z.string().min(16).max(4096),
    choice: z.number().int().min(0).max(3),
  })
  .strict();

const STATUS = { session_invalid: 400, session_expired: 410, conflict: 409 } as const;

/** POST /api/game/answer — the server checks the choice and returns the reveal plus the next question or summary. */
export async function POST(req: Request) {
  const limited = limitOrError(req, "game-answer", 120, 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, Body);
  if ("error" in parsed) return parsed.error;
  try {
    const out = answerStandardGame(parsed.data.token, parsed.data.choice);
    if ("error" in out) return apiError(out.error, STATUS[out.error]);
    return apiOk(out);
  } catch (err) {
    console.error("[game/answer] failed", err instanceof Error ? err.message : "unknown");
    return apiError("internal", 500);
  }
}
