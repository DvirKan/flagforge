import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seededRng } from "@/lib/game/rng";
import { addCalendarDays } from "@/lib/time/zoned";
import {
  deleteDraft,
  fillAhead,
  generateDraft,
  getAudit,
  getCalendar,
  getChallenge,
  getOverview,
  publish,
  replaceQuestion,
  unpublish,
  type Actor,
} from "@/server/admin/calendar";
import { selectionContext as ctx } from "@/server/countries";
import { as, createUser, dropTestDatabase, failure, pgRpc, resetDatabase, TEST_DATABASE_URL } from "./db";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("admin: daily calendar service ↔ database", () => {
  let db: Client;
  let today: string;
  let actor: Actor;
  const rng = seededRng(42);
  const rpc = () => pgRpc(db);

  beforeAll(async () => {
    const url = await resetDatabase();
    db = new Client({ connectionString: url });
    await db.connect();
    actor = { id: await createUser(db, "chief@example.test", "chief"), source: "admin" };
    today = (await db.query("select public.challenge_today()::text d")).rows[0].d;
  }, 60_000);

  afterAll(async () => {
    await db?.end();
    await dropTestDatabase();
  });

  it("generates a valid draft and regenerates it", async () => {
    const date = addCalendarDays(today, 5);
    expect(await generateDraft(rpc(), ctx, rng, actor, date)).toEqual({ ok: true });
    const first = await getChallenge(rpc(), date);
    expect(first.status).toBe("draft");
    expect(first.problems).toEqual([]);
    expect(first.questions?.map((q) => q.difficulty)).toEqual(["easy", "easy", "medium", "medium", "hard"]);
    expect(first.questions?.every((q) => q.options.length === 4 && q.options.includes(q.country))).toBe(true);
    expect(await generateDraft(rpc(), ctx, rng, actor, date)).toEqual({ ok: true });
    const second = await getChallenge(rpc(), date);
    expect(second.questions?.map((q) => q.country)).not.toEqual(first.questions?.map((q) => q.country));
  });

  it("replaces one question — chosen or random — keeping difficulty and the other four", async () => {
    const date = addCalendarDays(today, 5);
    const before = (await getChallenge(rpc(), date)).questions ?? [];
    const hardPick = ctx.countries.find((c) => c.difficulty === "hard" && !before.some((q) => q.country === c.iso2));
    expect(await replaceQuestion(rpc(), ctx, rng, actor, date, 5, hardPick?.iso2 ?? null)).toEqual({ ok: true });
    const after = (await getChallenge(rpc(), date)).questions ?? [];
    expect(after[4]?.country).toBe(hardPick?.iso2);
    expect(after.slice(0, 4)).toEqual(before.slice(0, 4));

    expect(await replaceQuestion(rpc(), ctx, rng, actor, date, 1, null)).toEqual({ ok: true });
    const random = (await getChallenge(rpc(), date)).questions ?? [];
    expect(random[0]?.country).not.toBe(after[0]?.country);
    expect(random[0]?.difficulty).toBe("easy");
    expect((await getChallenge(rpc(), date)).problems).toEqual([]);
  });

  it("rejects a replacement of the wrong difficulty or already in the challenge", async () => {
    const date = addCalendarDays(today, 5);
    const qs = (await getChallenge(rpc(), date)).questions ?? [];
    const easy = ctx.countries.find((c) => c.difficulty === "easy" && !qs.some((q) => q.country === c.iso2));
    expect(await replaceQuestion(rpc(), ctx, rng, actor, date, 5, easy?.iso2 ?? "")).toMatchObject({ ok: false, error: "bad_request" });
    expect(await replaceQuestion(rpc(), ctx, rng, actor, date, 2, qs[0]?.country ?? "")).toMatchObject({ ok: false, error: "bad_request" });
    expect(await replaceQuestion(rpc(), ctx, rng, actor, date, 9, null)).toMatchObject({ ok: false, error: "bad_request" });
  });

  it("publishes, then refuses edits; unpublishes a future date; deletes drafts only", async () => {
    const date = addCalendarDays(today, 5);
    expect(await publish(rpc(), actor, date)).toEqual({ ok: true });
    expect(await generateDraft(rpc(), ctx, rng, actor, date)).toMatchObject({ ok: false, error: "already_published" });
    expect(await replaceQuestion(rpc(), ctx, rng, actor, date, 1, null)).toMatchObject({ ok: false, error: "already_published" });
    expect(await deleteDraft(rpc(), actor, date)).toMatchObject({ ok: false, error: "not_draft" });
    expect(await unpublish(rpc(), actor, date)).toEqual({ ok: true });
    expect((await getChallenge(rpc(), date)).status).toBe("draft");
    expect(await deleteDraft(rpc(), actor, date)).toEqual({ ok: true });
    expect((await getChallenge(rpc(), date)).status).toBe("missing");
  });

  it("refuses to unpublish today's live challenge", async () => {
    expect(await generateDraft(rpc(), ctx, rng, actor, today)).toEqual({ ok: true });
    expect(await publish(rpc(), actor, today)).toEqual({ ok: true });
    expect(await unpublish(rpc(), actor, today)).toMatchObject({ ok: false, error: "already_live" });
  });

  it("reports validation problems instead of publishing an invalid draft", async () => {
    const date = addCalendarDays(today, 9);
    expect(await generateDraft(rpc(), ctx, rng, actor, date)).toEqual({ ok: true });
    // Corrupt the draft behind the service's back (as a broken import might): drop an option.
    const qid = (await db.query("select q.id from public.daily_challenge_questions q join public.daily_challenges c on c.id = q.challenge_id where c.challenge_date = $1 and q.position = 3", [date])).rows[0].id;
    await db.query("delete from public.daily_challenge_question_options where question_id = $1 and position = 3", [qid]);
    const res = await publish(rpc(), actor, date);
    expect(res).toMatchObject({ ok: false, error: "invalid" });
    expect(res.ok ? [] : res.problems?.length).toBeGreaterThan(0);
    expect((await getChallenge(rpc(), date)).status).toBe("draft");
  });

  it("fills a range: keeps published days, regenerates invalid drafts, avoids nearby repeats", async () => {
    const report = await fillAhead(rpc(), ctx, rng, actor, today, 14);
    expect(report.failed).toEqual([]);
    expect(report.skipped).toEqual([today]);
    expect(report.published).toHaveLength(13);
    const calendar = await getCalendar(rpc(), today, addCalendarDays(today, 13));
    expect(calendar.every((d) => d.status === "published" && d.problems.length === 0)).toBe(true);
    const all = calendar.flatMap((d) => d.countries);
    // 14 days × 5 flags from 193: the generator avoids repeats while enough fresh flags remain per difficulty.
    expect(new Set(all).size).toBeGreaterThanOrEqual(all.length - 5);
    expect((await getOverview(rpc())).first_unpublished).toBe(addCalendarDays(today, 14));
  });

  it("dry runs change nothing", async () => {
    const before = (await db.query("select count(*)::int n from public.daily_challenges")).rows[0].n;
    const report = await fillAhead(rpc(), ctx, rng, actor, addCalendarDays(today, 20), 3, { dryRun: true });
    expect(report.published).toHaveLength(3);
    expect((await db.query("select count(*)::int n from public.daily_challenges")).rows[0].n).toBe(before);
  });

  it("records every change in an append-only audit log", async () => {
    const audit = await getAudit(rpc(), 100);
    const actions = audit.map((a) => a.action);
    for (const a of ["daily.generate", "daily.regenerate", "daily.replace_question", "daily.publish", "daily.unpublish", "daily.delete_draft", "daily.fill_ahead"]) {
      expect(actions).toContain(a);
    }
    expect(audit.find((a) => a.action === "daily.replace_question")).toMatchObject({ actor: "chief", source: "admin" });
    expect(await failure(() => db.query("update public.admin_audit_log set action = 'x.y.z'"))).toMatch(/audit_log_append_only/);
    expect(await failure(() => db.query("delete from public.admin_audit_log"))).toMatch(/audit_log_append_only/);
  });

  it("keeps the audit history when an admin's account is deleted", async () => {
    const temp = await createUser(db, "temp@example.test", "temp_admin");
    await rpc().call("admin_log", { p_actor_id: temp, p_source: "admin", p_action: "daily.publish", p_target: today, p_details: {} });
    await db.query("delete from auth.users where id = $1", [temp]);
    const kept = (await db.query("select actor_id, action from public.admin_audit_log where target = $1 and action = 'daily.publish' order by id desc limit 1", [today])).rows[0];
    expect(kept).toEqual({ actor_id: null, action: "daily.publish" });
    expect(await failure(() => db.query("update public.admin_audit_log set actor_id = $1 where actor_id is null", [actor.id]))).toMatch(/audit_log_append_only/);
  });

  it("is invisible to clients", async () => {
    const uid = actor.id ?? "";
    expect(await failure(() => as(db, "authenticated", uid, () => db.query("select * from public.admin_audit_log")))).toMatch(/permission denied/);
    for (const call of ["public.admin_overview()", "public.admin_audit_recent(5)", `public.admin_challenge_detail('${today}')`]) {
      expect(await failure(() => as(db, "authenticated", uid, () => db.query(`select ${call}`)))).toMatch(/permission denied/);
      expect(await failure(() => as(db, "anon", null, () => db.query(`select ${call}`)))).toMatch(/permission denied/);
    }
  });
});
