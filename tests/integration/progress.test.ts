import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateDailyChallenge } from "@/lib/daily/generator";
import { seededRng } from "@/lib/game/rng";
import { selectionContext } from "@/server/countries";
import { as, createUser, dropTestDatabase, failure, resetDatabase, TEST_DATABASE_URL } from "./db";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

/**
 * Progress layer: period Hall of Fame, streaks, statistics, discovered countries and trigger-awarded achievements.
 * Past-dated results are written directly (as the database owner) — the gameplay functions only ever act on
 * today, and their behaviour is covered by daily.test.ts / persisted-game.test.ts.
 */
suite("progress, rankings and achievements (database)", () => {
  let db: Client;
  let url: string;
  const users: Record<string, string> = {};
  const challengeIds = new Map<number, string>();

  const svc = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
    as(db, "service_role", null, async () => (await db.query(sql, params)).rows[0]?.r as T, true);
  const day = async (offset: number) => (await db.query("select (public.challenge_today() + $1::int)::text d", [offset])).rows[0].d as string;

  async function challenge(offset: number): Promise<string> {
    const existing = challengeIds.get(offset);
    if (existing) return existing;
    const date = await day(offset);
    const id = await svc<string>("select public.upsert_daily_challenge_draft($1::date, $2::jsonb) r", [
      date,
      JSON.stringify(generateDailyChallenge(selectionContext, seededRng(1000 + offset))),
    ]);
    await svc("select public.publish_daily_challenge($1) r", [id]);
    challengeIds.set(offset, id);
    return id;
  }

  /** A completed daily attempt `offset` days from today with `correct` right answers in `elapsedMs`. */
  async function daily(user: string, offset: number, correct: number, elapsedMs: number) {
    const cid = await challenge(offset);
    const { rows } = await db.query(
      "insert into public.daily_attempts (challenge_id, user_id, started_at) values ($1, $2, now() - interval '1 minute') returning id",
      [cid, user],
    );
    const attempt = rows[0].id as string;
    const qs = await db.query("select id, country_id from public.daily_challenge_questions where challenge_id = $1 order by position", [cid]);
    for (const [i, q] of qs.rows.entries()) {
      const right = i < correct;
      await db.query(
        `insert into public.daily_attempt_answers (attempt_id, question_id, selected_country_id, is_correct)
         values ($1, $2, case when $4 then $3::uuid else (select id from public.countries where id <> $3 limit 1) end, $4)`,
        [attempt, q.id, q.country_id, right],
      );
    }
    await db.query("update public.daily_attempts set status = 'completed', correct_count = $2, elapsed_ms = $3, completed_at = now() where id = $1", [
      attempt,
      correct,
      elapsedMs,
    ]);
    return attempt;
  }

  /** A completed standard game: the given ISO codes, the first `correct` of them answered correctly. */
  async function standard(user: string, difficulty: string, isos: string[], correct: number) {
    const { rows } = await db.query(
      "insert into public.game_sessions (user_id, difficulty, total_questions) values ($1, $2, $3) returning id",
      [user, difficulty, isos.length],
    );
    const session = rows[0].id as string;
    for (const [i, iso] of isos.entries()) {
      const c = (await db.query("select id from public.countries where iso_code = $1", [iso])).rows[0].id;
      const others = (await db.query("select array_agg(id) a from (select id from public.countries where id <> $1 limit 3) x", [c])).rows[0].a;
      await db.query(
        `insert into public.game_session_questions (session_id, position, country_id, option_ids, correct_index, presented_at, answered_at, selected_index, is_correct, points)
         values ($1, $2, $3, $4, 0, now(), now(), $5, $6, $7)`,
        [session, i + 1, c, [c, ...others], i < correct ? 0 : 1, i < correct, i < correct ? 100 : 0],
      );
    }
    await db.query("update public.game_sessions set status = 'completed', correct_count = $2::smallint, score = $2::int * 100, elapsed_ms = 1000, completed_at = now() where id = $1", [
      session,
      correct,
    ]);
    return session;
  }

  const earned = async (user: string) =>
    (
      await db.query(
        "select a.code from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id where ua.user_id = $1 order by a.code",
        [user],
      )
    ).rows.map((r) => r.code as string);

  beforeAll(async () => {
    url = await resetDatabase();
    db = new Client({ connectionString: url });
    await db.connect();
    for (const name of ["ann", "ben", "cat", "dan", "eve"]) users[name] = await createUser(db, `${name}@example.test`, name);
  }, 60_000);

  afterAll(async () => {
    await db?.end();
    await dropTestDatabase();
  });

  describe("period Hall of Fame", () => {
    beforeAll(async () => {
      const { ann = "", ben = "", cat = "", dan = "" } = users;
      // ann: 3 perfect (slow); ben: 3 perfect (faster) + 1 imperfect; cat: 2 perfect very fast; dan: only imperfect.
      for (const o of [-1, -2, -3]) await daily(ann, o, 5, 30_000);
      for (const o of [-1, -2, -3]) await daily(ben, o, 5, 20_000);
      await daily(ben, -4, 3, 5_000);
      for (const o of [-1, -2]) await daily(cat, o, 5, 5_000);
      await daily(dan, -1, 4, 1_000);
    }, 60_000);

    it("ranks by perfect count, then combined time of perfect runs", async () => {
      const from = await day(-6);
      const to = await day(0);
      const rows = (await db.query("select rank::int, username, perfect_count, total_ms::int, days_played from public.period_leaderboard($1, $2)", [from, to])).rows;
      expect(rows).toEqual([
        { rank: 1, username: "ben", perfect_count: 3, total_ms: 60_000, days_played: 4 },
        { rank: 2, username: "ann", perfect_count: 3, total_ms: 90_000, days_played: 3 },
        { rank: 3, username: "cat", perfect_count: 2, total_ms: 10_000, days_played: 2 },
      ]);
    });

    it("only counts challenges inside the period", async () => {
      const d = await day(-1);
      const rows = (await db.query("select username, perfect_count from public.period_leaderboard($1, $1)", [d])).rows;
      expect(rows.map((r) => r.username)).toEqual(["cat", "ben", "ann"]);
      expect(rows.every((r) => r.perfect_count === 1)).toBe(true);
    });

    it("is readable by anonymous visitors and exposes no user ids", async () => {
      const rows = await as(db, "anon", null, async () => (await db.query("select * from public.period_leaderboard(current_date - 30, current_date)")).rows);
      expect(rows.length).toBe(3);
      expect(Object.keys(rows[0] ?? {})).not.toContain("user_id");
    });
  });

  describe("streaks and statistics", () => {
    it("computes current and longest streaks over consecutive challenge days", async () => {
      const eve = users.eve ?? "";
      // Longest run: -10..-6 (5 days). Current run: -2, -1 (today not played yet still counts).
      for (const o of [-10, -9, -8, -7, -6, -2, -1]) await daily(eve, o, 2, 40_000);
      const s = (await db.query("select * from public.daily_streaks($1)", [eve])).rows[0];
      expect(s).toEqual({ current_streak: 2, longest_streak: 5 });
    });

    it("drops the current streak after a missed day", async () => {
      const dan = users.dan ?? "";
      await daily(dan, -3, 1, 9_000); // dan: -3 and -1 → no consecutive run ending yesterday longer than 1
      const s = (await db.query("select * from public.daily_streaks($1)", [dan])).rows[0];
      expect(s).toEqual({ current_streak: 1, longest_streak: 1 });
      const none = (await db.query("select * from public.daily_streaks(gen_random_uuid())")).rows[0];
      expect(none).toEqual({ current_streak: 0, longest_streak: 0 });
    });

    it("reports standard and daily statistics separately", async () => {
      const cat = users.cat ?? "";
      await standard(cat, "easy", ["FR", "JP", "BR", "DE"], 4);
      await standard(cat, "hard", ["TD", "RO", "MC", "ID"], 2);
      const s = (await db.query("select public.player_stats($1) r", [cat])).rows[0].r;
      expect(s.standard).toEqual({ games_completed: 2, perfect_games: 1, best_score: 400, questions_answered: 8, correct_answers: 6 });
      expect(s.daily).toMatchObject({ attempts: 2, completed: 2, perfect: 2, fastest_perfect_ms: 5000, questions_answered: 10, correct_answers: 10 });
      expect(s.streak).toEqual({ current: 2, longest: 2 });
      expect(s.countries_total).toBe(193);
    });

    it("discovers a country once, from either mode, keeping the first date", async () => {
      const cat = users.cat ?? "";
      await standard(cat, "easy", ["FR", "IT"], 1); // FR again (already discovered), IT wrong
      const rows = (await db.query("select iso_code from public.discovered_countries($1)", [cat])).rows.map((r) => r.iso_code);
      expect(new Set(rows).size).toBe(rows.length);
      expect(rows).toEqual(expect.arrayContaining(["FR", "JP", "BR", "DE", "TD", "RO"]));
      expect(rows).not.toContain("IT");
      expect(rows).not.toContain("MC");
      const stats = (await db.query("select public.player_stats($1) r", [cat])).rows[0].r;
      expect(stats.countries_discovered).toBe(rows.length);
    });
  });

  describe("achievements", () => {
    it("awards achievements from completion triggers", async () => {
      const cat = users.cat ?? "";
      expect(await earned(cat)).toEqual(expect.arrayContaining(["first_game", "first_perfect_game", "first_perfect_daily"]));
      expect(await earned(cat)).not.toContain("hard_perfect");
      expect(await earned(cat)).not.toContain("five_perfect_daily");
    });

    it("never awards the same achievement twice", async () => {
      const cat = users.cat ?? "";
      const before = await earned(cat);
      await standard(cat, "easy", ["ES"], 1);
      await svc("select count(*) r from public.evaluate_achievements($1)", [cat]);
      expect(await earned(cat)).toEqual(before);
      expect(await failure(() => db.query(
        "insert into public.user_achievements (user_id, achievement_id) select $1, id from public.achievements where code = 'first_game'",
        [cat],
      ))).toMatch(/duplicate key/);
    });

    it("uses thresholds: streak, perfect dailies, hard perfect", async () => {
      const ann = users.ann ?? "";
      for (const o of [-4, -5, -6, -7]) await daily(ann, o, 5, 25_000); // 7 perfect days in a row, -7..-1
      const codes = await earned(ann);
      expect(codes).toEqual(expect.arrayContaining(["first_perfect_daily", "five_perfect_daily", "streak_7"]));
      await standard(ann, "hard", ["TD", "RO"], 2);
      expect(await earned(ann)).toContain("hard_perfect");
    });

    it("reports achievements earned since a game started", async () => {
      const eve = users.eve ?? "";
      const session = await standard(eve, "hard", ["TD", "RO"], 2);
      const rows = (await db.query("select public.achievements_since_start($1, $2) r", [eve, session])).rows[0].r.map((r: { code: string }) => r.code);
      expect(rows).toEqual(expect.arrayContaining(["first_game", "first_perfect_game", "hard_perfect"]));
      expect(rows).not.toContain("first_perfect_daily");
      const other = (await db.query("select public.achievements_since_start($1, $2) r", [users.ben, session])).rows[0].r;
      expect(other).toEqual([]);
    });

    it("requires a minimum number of answers for accuracy", async () => {
      const ben = users.ben ?? "";
      expect(await earned(ben)).not.toContain("accuracy_90"); // 18/20 correct = 90%, but under 100 answers
    });

    it("lets players read only their own achievements", async () => {
      const own = await as(db, "authenticated", users.cat ?? "", async () => (await db.query("select user_id from public.user_achievements")).rows);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((r) => r.user_id === users.cat)).toBe(true);
      const catalogue = await as(db, "anon", null, async () => (await db.query("select code from public.achievements")).rows);
      expect(catalogue.length).toBe(11);
      expect(await failure(() => as(db, "authenticated", users.cat ?? "", () => db.query("insert into public.user_achievements (user_id, achievement_id) select $1, id from public.achievements limit 1", [users.cat])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", users.cat ?? "", () => db.query("select public.evaluate_achievements($1)", [users.cat])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", users.cat ?? "", () => db.query("select public.player_stats($1)", [users.ben])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "anon", null, () => db.query("select public.my_stats()")))).toMatch(/permission denied/);
    });

    it("serves a signed-in player's own stats and atlas without a user id", async () => {
      const cat = users.cat ?? "";
      const mine = await as(db, "authenticated", cat, async () => (await db.query("select public.my_stats() r")).rows[0].r);
      const direct = (await db.query("select public.player_stats($1) r", [cat])).rows[0].r;
      expect(mine).toEqual(direct);
      const atlas = await as(db, "authenticated", cat, async () => (await db.query("select iso_code from public.my_discovered_countries()")).rows);
      expect(atlas.length).toBe(direct.countries_discovered);
    });
  });
});
