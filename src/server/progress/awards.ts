import "server-only";
import type { EarnedAchievement } from "@/lib/game/types";
import type { GameRpc } from "../game/rpc";

/**
 * Achievements the database awarded since this game/attempt started (the completion trigger has already run).
 * Never fails the game: if the lookup errors, the result screen simply shows no celebration.
 */
export interface AchievementRow {
  code: string;
  name_en: string;
  name_he: string;
  icon_key: string | null;
}

export function toEarned(rows: AchievementRow[] | null | undefined): EarnedAchievement[] {
  return (rows ?? []).map((r) => ({ code: r.code, name: { en: r.name_en, he: r.name_he }, iconKey: r.icon_key }));
}

export async function achievementsSinceStart(rpc: GameRpc, userId: string, gameId: string): Promise<EarnedAchievement[]> {
  try {
    return toEarned(await rpc.call<AchievementRow[]>("achievements_since_start", { p_user_id: userId, p_game_id: gameId }));
  } catch {
    return [];
  }
}
