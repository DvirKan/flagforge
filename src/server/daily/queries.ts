import "server-only";
import { gameConfig } from "@/config/game";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calendarDateIn } from "@/lib/time/zoned";

export interface LeaderboardRow {
  rank: number;
  username: string;
  displayName: string | null;
  correct: number;
  elapsedMs: number;
  completedAt: string;
  perfect: boolean;
}

export function todayChallengeDate(now = new Date()): string {
  return calendarDateIn(now, gameConfig.daily.timezone);
}

/** Published challenge for a date (only id/date are client-visible), or null. */
export async function getPublishedChallenge(date: string): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("daily_challenges").select("id").eq("challenge_date", date).eq("status", "published").maybeSingle();
  return data ? { id: data.id as string } : null;
}

export async function getDailyLeaderboard(date: string, limit = 50): Promise<LeaderboardRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("daily_leaderboard", { p_date: date, p_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    rank: Number(r.rank),
    username: r.username,
    displayName: r.display_name,
    correct: r.correct_count,
    elapsedMs: Number(r.elapsed_ms),
    completedAt: r.completed_at,
    perfect: r.is_perfect,
  }));
}

/** The signed-in user's attempt on a challenge (RLS: own rows only). */
export async function getMyAttempt(challengeId: string): Promise<{ status: "active" | "completed"; startedAt: string; correct: number; elapsedMs: number | null } | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("daily_attempts").select("status, started_at, correct_count, elapsed_ms").eq("challenge_id", challengeId).maybeSingle();
  if (!data) return null;
  return { status: data.status, startedAt: data.started_at, correct: data.correct_count, elapsedMs: data.elapsed_ms === null ? null : Number(data.elapsed_ms) };
}
