import { z } from "zod";
import { DIFFICULTIES } from "@/config/game";
import { apiError, apiOk, limitOrError, parseJson } from "@/server/http";
import { startStandardGame } from "@/server/game/standard";

export const runtime = "nodejs";

const Body = z.object({ difficulty: z.enum(DIFFICULTIES) }).strict();

/** POST /api/game/start — begins a standard game. Response contains the first question only (no answers). */
export async function POST(req: Request) {
  const limited = limitOrError(req, "game-start", 30, 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, Body);
  if ("error" in parsed) return parsed.error;
  try {
    return apiOk(startStandardGame(parsed.data.difficulty));
  } catch (err) {
    console.error("[game/start] failed", err instanceof Error ? err.message : "unknown");
    return apiError("internal", 500);
  }
}
