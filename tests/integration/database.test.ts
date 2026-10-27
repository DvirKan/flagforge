import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { answerPoints } from "@/lib/game/scoring";
import generated from "@/server/data/countries.json";
import { as, createUser, failure, resetDatabase, TEST_DATABASE_URL } from "./db";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("database (migrations + RLS + functions)", () => {
  let db: Client;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    const url = await resetDatabase();
    db = new Client({ connectionString: url });
    await db.connect();
    alice = await createUser(db, "alice@example.test", "alice", "he");
    bob = await createUser(db, "bob@example.test", "bob");
  }, 60_000);

  afterAll(async () => {
    await db?.end();
  });

  const questions = (codes: string[][]) => JSON.stringify(codes.map(([country, ...options]) => ({ country, options })));
  const tenEasy = questions([
    ["JP", "JP", "KR", "CN", "VN"],
    ["FR", "IT", "FR", "BE", "IE"],
    ["US", "LR", "MY", "US", "CU"],
    ["BR", "AR", "CO", "VE", "BR"],
    ["DE", "DE", "BE", "AT", "NL"],
    ["IN", "PK", "IN", "NP", "BD"],
    ["CA", "US", "MX", "CA", "JM"],
    ["ES", "PT", "ES", "IT", "FR"],
    ["SE", "NO", "DK", "FI", "SE"],
    ["IL", "IL", "LB", "CY", "TR"],
  ]);

  describe("countries", () => {
    it("contains exactly the generated dataset", async () => {
      const { rows } = await db.query("select iso_code, name_en, name_he, difficulty from public.countries order by iso_code");
      expect(rows).toHaveLength(193);
      const expected = [...generated.countries].sort((a, b) => a.iso2.localeCompare(b.iso2));
      expect(rows.map((r) => r.iso_code)).toEqual(expected.map((c) => c.iso2));
      expect(rows.find((r) => r.iso_code === "IL")).toMatchObject({ name_en: "Israel", name_he: "ישראל", difficulty: "easy" });
    });

    it("is readable by anon but not writable by clients", async () => {
      const n = await as(db, "anon", null, async () => (await db.query("select count(*)::int as n from public.countries")).rows[0].n);
      expect(n).toBe(193);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.countries set name_en = 'x' where iso_code = 'JP'")))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "anon", null, () => db.query("delete from public.countries")))).toMatch(/permission denied/);
    });

    it("rejects invalid rows via constraints", async () => {
      expect(await failure(() => db.query("insert into public.countries (iso_code, name_en, name_he, difficulty, continent, flag_asset) values ('JP','Dup','דופ','easy','asia','flags/4x3/jp.svg')"))).toMatch(/duplicate key/);
      expect(await failure(() => db.query("insert into public.countries (iso_code, name_en, name_he, difficulty, continent, flag_asset) values ('ZZ','Zed','זד','extreme','asia','flags/4x3/zz.svg')"))).toMatch(/countries_difficulty_valid/);
      expect(await failure(() => db.query("insert into public.countries (iso_code, name_en, name_he, difficulty, continent, flag_asset) values ('ZZ','Zed',' ','easy','asia','flags/4x3/zz.svg')"))).toMatch(/countries_name_he_nonempty/);
    });
  });

  describe("profiles", () => {
    it("are created on signup with the requested username and language", async () => {
      const { rows } = await db.query("select username, preferred_language from public.profiles where id = $1", [alice]);
      expect(rows[0]).toEqual({ username: "alice", preferred_language: "he" });
    });

    it("fall back to a generated username when the requested one is invalid or taken", async () => {
      const taken = await createUser(db, "alice2@example.test", "alice");
      const invalid = await createUser(db, "weird@example.test", "No Spaces!");
      const reserved = await createUser(db, "adm@example.test", "admin");
      const { rows } = await db.query("select id, username from public.profiles where id = any($1)", [[taken, invalid, reserved]]);
      for (const r of rows) expect(r.username).toMatch(/^player_[0-9a-f]{8}$/);
    });

    it("let owners read and update only their own row and only allowed columns", async () => {
      const own = await as(db, "authenticated", alice, async () => (await db.query("select username from public.profiles")).rows);
      expect(own).toEqual([{ username: "alice" }]); // bob's row is invisible
      const updated = await as(db, "authenticated", alice, async () =>
        (await db.query("update public.profiles set display_name = 'Alice A.' where id = $1 returning display_name", [alice])).rows,
      );
      expect(updated).toEqual([{ display_name: "Alice A." }]);
      const others = await as(db, "authenticated", alice, async () => (await db.query("update public.profiles set display_name = 'hacked' where id = $1", [bob])).rowCount);
      expect(others).toBe(0);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.profiles set id = gen_random_uuid() where id = $1", [alice])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.profiles set created_at = now() where id = $1", [alice])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("insert into public.profiles (id, username) values (gen_random_uuid(), 'mallory')")))).toMatch(/permission denied/);
    });

    it("enforce username rules and uniqueness on update", async () => {
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.profiles set username = 'bob' where id = $1", [alice])))).toMatch(/duplicate key/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.profiles set username = 'Bad Name' where id = $1", [alice])))).toMatch(/profiles_username_valid/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.profiles set preferred_language = 'fr' where id = $1", [alice])))).toMatch(/profiles_language_valid/);
    });

    it("are invisible to anon; the public projection exposes no ids or private fields", async () => {
      const rows = await as(db, "anon", null, async () => (await db.query("select * from public.profiles")).rows).catch((e: Error) => e.message);
      expect(rows).toMatch(/permission denied/);
      const pub = await as(db, "anon", null, async () => (await db.query("select * from public.public_profiles where username = 'alice'")).rows);
      expect(Object.keys(pub[0]).sort()).toEqual(["avatar_url", "created_at", "display_name", "username"]);
    });

    it("username availability check", async () => {
      const r = await as(db, "anon", null, async () =>
        (await db.query("select public.username_available('alice') a, public.username_available('ALICE') b, public.username_available('fresh_name') c, public.username_available('x') d")).rows[0],
      );
      expect(r).toEqual({ a: false, b: false, c: true, d: false });
    });
  });

  describe("roles", () => {
    it("are not readable or grantable by clients", async () => {
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [alice])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("select public.is_admin($1)", [alice])))).toMatch(/permission denied/);
      await db.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [bob]);
      const r = await as(db, "service_role", null, async () => (await db.query("select public.is_admin($1) b, public.is_admin($2) a", [bob, alice])).rows[0]);
      expect(r).toEqual({ b: true, a: false });
    });
  });

  describe("standard games", () => {
    const start = (user: string, payload = tenEasy) =>
      as(db, "service_role", null, async () => (await db.query("select public.start_standard_game($1, 'easy', $2::jsonb) id", [user, payload])).rows[0].id as string, true);
    const answer = (user: string, session: string, position: number, choice: number) =>
      as(db, "service_role", null, async () => (await db.query("select public.answer_standard_question($1, $2, $3, $4) r", [user, session, position, choice])).rows[0].r, true);

    it("cannot be started or answered by clients directly", async () => {
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("select public.start_standard_game($1, 'easy', $2::jsonb)", [alice, tenEasy])))).toMatch(/permission denied/);
      const sid = await start(alice);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("select public.answer_standard_question($1, $2, 1, 0)", [alice, sid])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("update public.game_sessions set score = 99999 where id = $1", [sid])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("insert into public.game_sessions (user_id, difficulty, total_questions) values ($1, 'easy', 10)", [alice])))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "authenticated", alice, () => db.query("select correct_index from public.game_session_questions")))).toMatch(/permission denied/);
    });

    it("validate the question payload", async () => {
      const bad = (payload: string) => failure(() => start(alice, payload));
      expect(await bad(questions([["JP", "JP", "JP", "CN", "VN"]]))).toMatch(/gsq_four_options/);
      expect(await bad(questions([["JP", "KR", "CN", "VN", "TH"]]))).toMatch(/correct_answer_missing/);
      expect(await bad(questions([["JP", "JP", "KR", "CN"]]))).toMatch(/invalid_options/);
      expect(await bad(questions([["XX", "XX", "KR", "CN", "VN"]]))).toMatch(/unknown_country/);
      expect(await bad(questions([["JP", "JP", "KR", "CN", "VN"], ["JP", "JP", "KR", "CN", "VN"]]))).toMatch(/duplicate key/);
      expect(await bad("[]")).toMatch(/invalid_question_count/);
    });

    it("accept each answer exactly once, in order, and compute the result on the server", async () => {
      const sid = await start(alice);
      expect(await failure(() => answer(alice, sid, 2, 0))).toMatch(/conflict/); // cannot skip ahead
      expect(await failure(() => answer(bob, sid, 1, 0))).toMatch(/session_not_found/); // not bob's session
      const first = await answer(alice, sid, 1, 0); // JP is option 0
      expect(first).toMatchObject({ correct: true, correct_index: 0, country: "JP", completed: false });
      expect(await failure(() => answer(alice, sid, 1, 1))).toMatch(/conflict/); // cannot re-answer
      const second = await answer(alice, sid, 2, 0); // FR is option 1 → wrong
      expect(second).toMatchObject({ correct: false, correct_index: 1, points: 0 });
      let last: Record<string, unknown> = {};
      for (let pos = 3; pos <= 10; pos++) last = await answer(alice, sid, pos, 0);
      expect(last.completed).toBe(true);
      const { rows } = await db.query("select status, correct_count, score, elapsed_ms, completed_at from public.game_sessions where id = $1", [sid]);
      // correct at option 0: JP, DE, IL (+ others not at index 0)
      expect(rows[0]).toMatchObject({ status: "completed", correct_count: 3 });
      expect(Number(rows[0].elapsed_ms)).toBeGreaterThanOrEqual(0);
      const { rows: pts } = await db.query("select coalesce(sum(points),0)::int s from public.game_session_questions where session_id = $1", [sid]);
      expect(rows[0].score).toBe(pts[0].s);
      expect(await failure(() => answer(alice, sid, 10, 0))).toMatch(/conflict/); // finished
    });

    it("concurrent submissions for the same question: exactly one succeeds", async () => {
      const sid = await start(alice);
      const url = new URL(TEST_DATABASE_URL ?? "");
      url.pathname = "/flagforge_test";
      const clients = await Promise.all([0, 1, 2, 3].map(async () => {
        const c = new Client({ connectionString: url.toString() });
        await c.connect();
        return c;
      }));
      const results = await Promise.allSettled(
        clients.map((c, i) => c.query("select public.answer_standard_question($1, $2, 1, $3) r", [alice, sid, i])),
      );
      await Promise.all(clients.map((c) => c.end()));
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected").every((r) => /conflict/.test(String((r as PromiseRejectedResult).reason)))).toBe(true);
      const { rows } = await db.query("select count(*)::int n from public.game_session_questions where session_id = $1 and answered_at is not null", [sid]);
      expect(rows[0].n).toBe(1);
    });

    it("starting a new game abandons the previous active one", async () => {
      const a = await start(bob);
      const b = await start(bob);
      const { rows } = await db.query("select id, status from public.game_sessions where id = any($1)", [[a, b]]);
      expect(Object.fromEntries(rows.map((r) => [r.id, r.status]))).toEqual({ [a]: "abandoned", [b]: "active" });
    });

    it("are visible only to their owner, and answered history hides unanswered answers", async () => {
      const sid = await start(alice);
      await answer(alice, sid, 1, 0);
      const mine = await as(db, "authenticated", alice, async () => (await db.query("select count(*)::int n from public.game_sessions")).rows[0].n);
      const theirs = await as(db, "authenticated", bob, async () => (await db.query("select count(*)::int n from public.game_sessions where user_id = $1", [alice])).rows[0].n);
      expect(mine).toBeGreaterThan(0);
      expect(theirs).toBe(0);
      const history = await as(db, "authenticated", alice, async () => (await db.query("select * from public.my_answered_questions($1)", [sid])).rows);
      expect(history).toHaveLength(1);
      const spy = await as(db, "authenticated", bob, async () => (await db.query("select * from public.my_answered_questions($1)", [sid])).rows);
      expect(spy).toHaveLength(0);
      const anon = await as(db, "anon", null, async () => (await db.query("select * from public.game_sessions")).rows).catch((e: Error) => e.message);
      expect(anon).toMatch(/permission denied/);
    });

    it("score formula matches the TypeScript implementation", async () => {
      const cases: [boolean, number][] = [[false, 0], [true, 0], [true, 1], [true, 7_500], [true, 7_499], [true, 14_999], [true, 15_000], [true, 99_000], [true, -10]];
      for (const [ok, ms] of cases) {
        const { rows } = await db.query("select public.answer_points($1, $2) p", [ok, ms]);
        expect(rows[0].p, `${ok}/${ms}`).toBe(answerPoints(ok, ms));
      }
    });

    it("deleting an account removes its profile and games (cascade)", async () => {
      const carol = await createUser(db, "carol@example.test", "carol");
      const sid = await start(carol);
      await db.query("delete from auth.users where id = $1", [carol]);
      const { rows } = await db.query("select (select count(*) from public.profiles where id = $1)::int p, (select count(*) from public.game_sessions where id = $2)::int g, (select count(*) from public.game_session_questions where session_id = $2)::int q", [carol, sid]);
      expect(rows[0]).toEqual({ p: 0, g: 0, q: 0 });
    });
  });

  describe("privileges audit", () => {
    it("every public table has RLS enabled", async () => {
      const { rows } = await db.query("select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity");
      expect(rows).toEqual([]);
    });

    it("no security-definer function is executable by anon unless intended", async () => {
      const { rows } = await db.query(`
        select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
        order by 1`);
      expect(rows.map((r) => r.proname)).toEqual(["username_available"]);
    });
  });
});
