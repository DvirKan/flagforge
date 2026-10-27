import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Reads for the progress layer. All go through the user-scoped client: RLS and auth.uid() wrappers decide access. */

export interface PeriodRow {
  rank: number;
  username: string;
  displayName: string | null;
  perfectCount: number;
  totalMs: number;
  daysPlayed: number;
}

export interface PlayerStats {
  standard: { games_completed: number; perfect_games: number; best_score: number; questions_answered: number; correct_answers: number };
  daily: { attempts: number; completed: number; perfect: number; fastest_perfect_ms: number | null; questions_answered: number; correct_answers: number };
  streak: { current: number; longest: number };
  countries_discovered: number;
  countries_total: number;
  achievements_earned: number;
}

export interface Achievement {
  code: string;
  nameEn: string;
  nameHe: string;
  descriptionEn: string;
  descriptionHe: string;
  iconKey: string | null;
  earnedAt: string | null;
}

export async function getPeriodLeaderboard(from: string, to: string, limit = 100): Promise<PeriodRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("period_leaderboard", { p_from: from, p_to: to, p_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    rank: Number(r.rank),
    username: r.username,
    displayName: r.display_name,
    perfectCount: r.perfect_count,
    totalMs: Number(r.total_ms),
    daysPlayed: r.days_played,
  }));
}

export async function getMyStats(): Promise<PlayerStats | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_stats");
  if (error || !data) return null;
  return data as PlayerStats;
}

export async function getMyDiscoveredCountries(): Promise<{ iso: string; firstAt: string }[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("my_discovered_countries");
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({ iso: r.iso_code, firstAt: r.first_identified_at }));
}

/** Full catalogue; `earnedAt` is set for the signed-in user's achievements (null for guests). */
export async function getAchievements(signedIn: boolean): Promise<Achievement[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const [{ data: catalogue }, mine] = await Promise.all([
    supabase.from("achievements").select("id, code, name_en, name_he, description_en, description_he, icon_key, sort_order").order("sort_order"),
    signedIn ? supabase.from("user_achievements").select("achievement_id, earned_at") : Promise.resolve({ data: [] as { achievement_id: string; earned_at: string }[] }),
  ]);
  const earned = new Map((mine.data ?? []).map((r) => [r.achievement_id as string, r.earned_at as string]));
  return (catalogue ?? []).map((a) => ({
    code: a.code,
    nameEn: a.name_en,
    nameHe: a.name_he,
    descriptionEn: a.description_en,
    descriptionHe: a.description_he,
    iconKey: a.icon_key,
    earnedAt: earned.get(a.id) ?? null,
  }));
}
