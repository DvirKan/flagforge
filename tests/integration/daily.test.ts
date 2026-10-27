import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateDailyChallenge } from "@/lib/daily/generator";
import { seededRng } from "@/lib/game/rng";
import { selectionContext } from "@/server/countries";
import { as, createUser, failure, resetDatabase, TEST_DATABASE_URL, dropTestDatabase } from "./db";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("daily challenge (database)", () => {
  let db: Client;
  let url: string;
  let today: string;
  const users: Record<string, string> = {};

  const svc = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
    as(db, "service_role", null, async () => (await db.query(sql, params)).rows[0]?.r as T, true);
  const addDays = async (n: number) => (await db.query("select (public.challenge_today() + $1::int)::text d", [n])).rows[0].d as string;
  const draft = (date: string, seed: number) =>
    svc<string>("select public.upsert_daily_challenge_draft($1::date, $2::jsonb) r", [date, JSON.stringify(generateDailyChallenge(selectionContext, seededRng(seed)))]);
  const publish = (id: string) => svc("select public.publish_daily_challenge($1) r", [id]);
  const start = (user: string) => svc<Record<string, unknown>>("select public.start_daily_attempt($1) r", [user]);
  const answer = (user: string, attempt: string, pos: number, choice: number) =>
    svc<Record<string, unknown>>("select public.answer_daily_question($1, $2, $3, $4) r", [user, attempt, pos, choice]);
  const question = (user: string, attempt: string, pos: number) =>
    svc<{ country: string; options: string[] }>("select public.daily_question_internal($1, $2, $3) r", [user, attempt, pos]);
  /** Plays a full attempt; `correctUpTo` questions answered correctly, the rest wrongly. */
  async function play(user: string, correct: number, pauseMs = 0) {
    const s = await start(user);
    const attempt = s.attempt_id as string;
    let last: Record<string, unknown> = {};
    for (let pos = 1; pos <= 5; pos++) {
      const q = await question(user, attempt, pos);
      const right = q.options.indexOf(q.country);
      if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
      last = await answer(user, attempt, pos, pos <= correct ? right : (right + 1) % 4);
    }
    return { attempt, last };
  }

  beforeAll(async () => {
    url = await resetDatabase();
    db = new Client({ connectionString: url });
    await db.connect();
    for (const name of ["ann", "ben", "cat", "dan", "eve", "fay"]) users[name] = await createUser(db, `${name}@example.test`, name);
    today = await addDays(0);
  }, 60_000);

  afterAll(async () => {
    await db?.end();
    await dropTestDatabase();
  });

  describe("authoring and publication", () => {
    it("publishes a valid generated challenge", async () => {
      const id = await draft(today, 1);
      const problems = await svc<string[]>("select public.validate_daily_challenge($1) r", [id]);
      expect(problems).toEqual([]);
      await publish(id);
      const { rows } = await db.query("select status, published_at is not null p from public.daily_challenges where id = $1", [id]);
      expect(rows[0]).toEqual({ status: "published", p: true });
    });

    it("allows only one challenge per date", async () => {
      expect(await failure(() => db.query("insert into public.daily_challenges (challenge_date) values ($1)", [today]))).toMatch(/duplicate key/);
    });

    it("refuses to publish incomplete or invalid challenges", async () => {
      const date = await addDays(10);
      const good = generateDailyChallenge(selectionContext, seededRng(7));
      const cases: [string, unknown][] = [
        ["4 questions", good.slice(0, 4)],
        ["wrong composition", [good[0], good[1], good[2], good[3], { ...good[0], country: good[1]?.country === "JP" ? "FR" : "JP", options: ["JP", "FR", "DE", "IT"], difficulty: "easy" }]],
        ["3 options", [{ ...good[0], options: good[0]?.options.slice(0, 3) }, ...good.slice(1)]],
        ["correct missing", [{ ...good[0], options: (good[1]?.options ?? []) }, ...good.slice(1)]],
        ["difficulty mismatch", [{ ...good[0], difficulty: "hard" }, ...good.slice(1, 4), { ...good[4], difficulty: "easy" }]],
      ];
      for (const [label, payload] of cases) {
        let id: string;
        try {
          id = await svc<string>("select public.upsert_daily_challenge_draft($1::date, $2::jsonb) r", [date, JSON.stringify(payload)]);
        } catch (err) {
          // Duplicate countries / positions can already be rejected by constraints while drafting — also fine.
          expect(String(err), label).toMatch(/duplicate key|violates/);
          continue;
        }
        expect(await failure(() => publish(id)), label).toMatch(/challenge_invalid/);
      }
      const overview = await svc<unknown>("select array_agg(status) r from public.daily_challenge_overview($1::date, $1::date)", [date]);
      expect(overview).toEqual(["draft"]);
    });

    it("makes published challenges immutable", async () => {
      const { rows } = await db.query("select q.id from public.daily_challenge_questions q join public.daily_challenges c on c.id = q.challenge_id where c.challenge_date = $1 limit 1", [today]);
      expect(await failure(() => db.query("update public.daily_challenge_questions set position = 5 where id = $1", [rows[0].id]))).toMatch(/challenge_published_immutable/);
      expect(await failure(() => db.query("delete from public.daily_challenge_question_options where question_id = $1", [rows[0].id]))).toMatch(/challenge_published_immutable/);
      expect(await failure(() => db.query("delete from public.daily_challenges where challenge_date = $1", [today]))).toMatch(/challenge_published_immutable/);
      expect(await failure(() => draft(today, 99))).toMatch(/challenge_published_immutable/);
      const id = (await db.query("select id from public.daily_challenges where challenge_date = $1", [today])).rows[0].id;
      expect(await failure(() => svc("select public.unpublish_daily_challenge($1) r", [id]))).toMatch(/challenge_already_live/);
    });

    it("allows unpublishing a future challenge nobody has started", async () => {
      const date = await addDays(3);
      const id = await draft(date, 3);
      await publish(id);
      await svc("select public.unpublish_daily_challenge($1) r", [id]);
      const { rows } = await db.query("select status from public.daily_challenges where id = $1", [id]);
      expect(rows[0].status).toBe("draft");
    });
  });

  describe("client access", () => {
    it("exposes only published challenge dates — never questions or options", async () => {
      const rows = await as(db, "anon", null, async () => (await db.query("select challenge_date::text d, status from public.daily_challenges")).rows);
      expect(rows.every((r) => r.status === "published")).toBe(true);
      expect(await failure(() => as(db, "anon", null, () => db.query("select * from public.daily_challenge_questions")))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", users.ann ?? "", () => db.query("select * from public.daily_challenge_question_options")))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", users.ann ?? "", () => db.query("select public.daily_question_internal($1, gen_random_uuid(), 1)", [users.ann])))).toMatch(/permission denied/);
    });

    it("clients cannot create attempts or write answers", async () => {
      expect(await failure(() => as(db, "authenticated", users.ann ?? "", () => db.query("select public.start_daily_attempt($1)", [users.ann])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", users.ann ?? "", () => db.query("insert into public.daily_attempts (challenge_id, user_id) select id, $1 from public.daily_challenges limit 1", [users.ann])))).toMatch(/permission denied/);
    });
  });

  describe("attempts", () => {
    it("one attempt per user: starting again resumes the same attempt (refresh-safe)", async () => {
      const first = await start(users.ann ?? "");
      const again = await start(users.ann ?? "");
      expect(again.attempt_id).toBe(first.attempt_id);
      expect(again.resumed).toBe(true);
      expect(again.started_at).toBe(first.started_at);
      const { rows } = await db.query("select count(*)::int n from public.daily_attempts where user_id = $1", [users.ann]);
      expect(rows[0].n).toBe(1);
    });

    it("concurrent starts create exactly one attempt", async () => {
      const clients = await Promise.all([0, 1, 2, 3].map(async () => {
        const c = new Client({ connectionString: url });
        await c.connect();
        return c;
      }));
      const results = await Promise.all(clients.map((c) => c.query("select public.start_daily_attempt($1) r", [users.fay])));
      await Promise.all(clients.map((c) => c.end()));
      expect(new Set(results.map((r) => r.rows[0].r.attempt_id)).size).toBe(1);
    });

    it("answers are accepted once, in order; the server computes the result", async () => {
      const s = await start(users.ben ?? "");
      const attempt = s.attempt_id as string;
      expect(await failure(() => answer(users.ben ?? "", attempt, 2, 0))).toMatch(/conflict/);
      expect(await failure(() => answer(users.ann ?? "", attempt, 1, 0))).toMatch(/attempt_not_found/);
      const q1 = await question(users.ben ?? "", attempt, 1);
      const r1 = await answer(users.ben ?? "", attempt, 1, q1.options.indexOf(q1.country));
      expect(r1).toMatchObject({ correct: true, completed: false, country: q1.country });
      expect(await failure(() => answer(users.ben ?? "", attempt, 1, 0))).toMatch(/conflict/);
      for (let pos = 2; pos <= 5; pos++) {
        const q = await question(users.ben ?? "", attempt, pos);
        await answer(users.ben ?? "", attempt, pos, q.options.indexOf(q.country));
      }
      const { rows } = await db.query("select status, correct_count, elapsed_ms from public.daily_attempts where id = $1", [attempt]);
      expect(rows[0]).toMatchObject({ status: "completed", correct_count: 5 });
      expect(Number(rows[0].elapsed_ms)).toBeGreaterThanOrEqual(0);
      const restart = await start(users.ben ?? "");
      expect(restart).toMatchObject({ attempt_id: attempt, status: "completed", resumed: true });
      expect(await failure(() => answer(users.ben ?? "", attempt, 5, 0))).toMatch(/conflict/);
    });

    it("concurrent answers to the same question: exactly one is recorded", async () => {
      const s = await start(users.cat ?? "");
      const clients = await Promise.all([0, 1, 2, 3].map(async () => {
        const c = new Client({ connectionString: url });
        await c.connect();
        return c;
      }));
      const results = await Promise.allSettled(clients.map((c, i) => c.query("select public.answer_daily_question($1, $2, 1, $3) r", [users.cat, s.attempt_id, i])));
      await Promise.all(clients.map((c) => c.end()));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const { rows } = await db.query("select count(*)::int n from public.daily_attempt_answers where attempt_id = $1", [s.attempt_id]);
      expect(rows[0].n).toBe(1);
    });

    it("cannot start when there is no published challenge today", async () => {
      await db.query("begin");
      await db.query("alter table public.daily_challenges disable trigger daily_challenges_guard");
      await db.query("update public.daily_challenges set status = 'draft', published_at = null where challenge_date = $1", [today]);
      const msg = await db.query("select public.start_daily_attempt($1)", [users.dan]).then(() => "ok", (e: Error) => e.message);
      await db.query("rollback");
      expect(msg).toMatch(/no_challenge_today/);
    });
  });

  describe("leaderboard", () => {
    it("ranks perfect runs first, then by time, then by completion; incomplete attempts are excluded", async () => {
      // ann: still active (incomplete). ben: perfect (finished earlier). cat: active.
      await play(users.dan ?? "", 5, 30); // perfect but slower than eve
      await play(users.eve ?? "", 5, 0); // perfect, fastest
      const board = await as(db, "anon", null, async () => (await db.query("select * from public.daily_leaderboard($1::date)", [today])).rows);
      const names = board.map((r) => r.username);
      expect(names).not.toContain("ann"); // incomplete
      expect(names).not.toContain("cat"); // incomplete
      expect(board.every((r) => r.is_perfect)).toBe(true);
      const times = board.map((r) => Number(r.elapsed_ms));
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(board.map((r) => Number(r.rank))).toEqual(board.map((_, i) => i + 1));
      expect(Object.keys(board[0] ?? {}).sort()).toEqual(["completed_at", "correct_count", "display_name", "elapsed_ms", "is_perfect", "rank", "username"]);
    });

    it("an imperfect run ranks below every perfect run, even if faster", async () => {
      const g = await createUser(db, "gus@example.test", "gus");
      await play(g, 4, 0);
      const board = (await db.query("select username, is_perfect from public.daily_leaderboard($1::date)", [today])).rows;
      const firstImperfect = board.findIndex((r) => !r.is_perfect);
      expect(firstImperfect).toBeGreaterThan(0);
      expect(board.slice(firstImperfect).every((r) => !r.is_perfect)).toBe(true);
      expect(board[firstImperfect]?.username).toBe("gus");
    });

    it("ties on time are broken by earlier completion", async () => {
      // Force two equal times and check deterministic order.
      await db.query("update public.daily_attempts set elapsed_ms = 10000 where user_id = any($1)", [[users.dan, users.eve]]);
      await db.query("update public.daily_attempts set completed_at = now() - interval '1 hour' where user_id = $1", [users.dan]);
      await db.query("update public.daily_attempts set completed_at = now() where user_id = $1", [users.eve]);
      const board = (await db.query("select username from public.daily_leaderboard($1::date) where elapsed_ms = 10000", [today])).rows;
      expect(board.map((r) => r.username)).toEqual(["dan", "eve"]);
    });
  });
});
