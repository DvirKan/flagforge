import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateDailyChallenge } from "@/lib/daily/generator";
import { seededRng } from "@/lib/game/rng";
import type { QuestionView } from "@/lib/game/types";
import { selectionContext } from "@/server/countries";
import { answerDaily, startDaily } from "@/server/daily/service";
import { resolveFlagHandle } from "@/server/game/flag-handle";
import type { GameRpc } from "@/server/game/rpc";
import { as, createUser, pgRpc, resetDatabase, TEST_DATABASE_URL, dropTestDatabase } from "./db";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("daily challenge (server service ↔ database)", () => {
  let db: Client;
  let rpc: GameRpc;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    process.env.GAME_SESSION_SECRET = "integration-secret-integration-secret-0123";
    db = new Client({ connectionString: await resetDatabase() });
    await db.connect();
    rpc = pgRpc(db);
    alice = await createUser(db, "alice@example.test", "alice");
    bob = await createUser(db, "bob@example.test", "bob");
  }, 60_000);

  afterAll(async () => {
    await db?.end();
    await dropTestDatabase();
  });

  it("reports when there is no challenge today", async () => {
    expect(await startDaily(rpc, alice)).toEqual({ error: "no_challenge" });
  });

  it("plays a full ranked attempt; refresh resumes; replay is rejected; result appears on the board", async () => {
    const today = (await db.query("select public.challenge_today()::text d")).rows[0].d;
    const payload = generateDailyChallenge(selectionContext, seededRng(5));
    const id = await as(db, "service_role", null, async () => (await db.query("select public.upsert_daily_challenge_draft($1::date, $2::jsonb) r", [today, JSON.stringify(payload)])).rows[0].r, true);
    await as(db, "service_role", null, () => db.query("select public.publish_daily_challenge($1)", [id]), true);

    const first = await startDaily(rpc, alice);
    if ("error" in first || first.kind !== "playing") throw new Error("expected playing");
    expect(JSON.stringify(first.question)).not.toMatch(/iso2|correct/);
    expect(first.question.total).toBe(5);

    // Answer question 1 correctly, then "refresh".
    const iso1 = resolveFlagHandle(first.question.flagUrl.split("/").pop() ?? "");
    expect(iso1).toBe(payload[0]?.country);
    const correctIdx = (payload[0]?.options ?? []).indexOf(iso1 ?? "");
    const a1 = await answerDaily(rpc, alice, first.token, correctIdx);
    if ("error" in a1) throw new Error(a1.error);
    expect(a1.result.correct).toBe(true);
    expect(await answerDaily(rpc, alice, first.token, 0)).toEqual({ error: "conflict" }); // replayed token

    const resumed = await startDaily(rpc, alice);
    if ("error" in resumed || resumed.kind !== "playing") throw new Error("expected playing");
    expect(resumed.resumed).toBe(true);
    expect(resumed.startedAt).toBe(first.startedAt); // clock was not reset
    expect(resumed.question.index).toBe(1);

    let token: string | null = resumed.token;
    let q: QuestionView | null = resumed.question;
    let final = null;
    while (token && q) {
      const iso = resolveFlagHandle(q.flagUrl.split("/").pop() ?? "");
      const item = payload.find((p) => p.country === iso);
      const out = await answerDaily(rpc, alice, token, item?.options.indexOf(iso ?? "") ?? 0);
      if ("error" in out) throw new Error(out.error);
      token = out.token;
      q = out.next;
      final = out.final;
    }
    expect(final).toMatchObject({ correct: 5, total: 5, perfect: true });
    expect(final?.review).toHaveLength(5);

    const again = await startDaily(rpc, alice);
    expect(again).toMatchObject({ kind: "completed", result: { correct: 5, perfect: true } });

    const board = (await db.query("select username, is_perfect from public.daily_leaderboard($1::date)", [today])).rows;
    expect(board).toEqual([{ username: "alice", is_perfect: true }]);
  });

  it("tokens are bound to their user", async () => {
    const s = await startDaily(rpc, bob);
    if ("error" in s || s.kind !== "playing") throw new Error("expected playing");
    expect(await answerDaily(rpc, alice, s.token, 0)).toEqual({ error: "session_invalid" });
  });
});
