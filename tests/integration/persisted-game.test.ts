import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seededRng } from "@/lib/game/rng";
import type { QuestionView } from "@/lib/game/types";
import { resolveFlagHandle } from "@/server/game/flag-handle";
import { answerPersistedGame, isPersistedToken, startPersistedGame } from "@/server/game/persisted";
import { RpcError, type GameRpc } from "@/server/game/rpc";
import { createUser, resetDatabase, TEST_DATABASE_URL } from "./db";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

/** pg-backed RPC adapter: calls the same SQL functions PostgREST would, as service_role. */
function pgRpc(db: Client): GameRpc {
  return {
    async call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
      const keys = Object.keys(args);
      const params = keys.map((k, i) => `${k} => $${i + 1}${k === "p_questions" ? "::jsonb" : ""}`).join(", ");
      const values = keys.map((k) => (k === "p_questions" ? JSON.stringify(args[k]) : args[k]));
      await db.query("begin");
      try {
        await db.query("set local role service_role");
        const { rows } = await db.query(`select public.${fn}(${params}) as r`, values);
        await db.query("commit");
        return rows[0].r as T;
      } catch (err) {
        await db.query("rollback");
        throw new RpcError((err as Error).message);
      }
    },
  };
}

suite("persisted standard game (server service ↔ database)", () => {
  let db: Client;
  let rpc: GameRpc;
  let user: string;
  let other: string;

  beforeAll(async () => {
    process.env.GAME_SESSION_SECRET = "integration-secret-integration-secret-0123";
    db = new Client({ connectionString: await resetDatabase() });
    await db.connect();
    rpc = pgRpc(db);
    user = await createUser(db, "player@example.test", "player");
    other = await createUser(db, "other@example.test", "other");
  }, 60_000);

  afterAll(async () => {
    await db?.end();
  });

  const isoOf = (v: QuestionView) => resolveFlagHandle(v.flagUrl.split("/").pop() ?? "");

  it("plays a full game; the database records every answer and the summary matches", async () => {
    const started = await startPersistedGame(rpc, user, "medium", { rng: seededRng(11) });
    expect(isPersistedToken(started.token)).toBe(true);
    expect(JSON.stringify(started.question)).not.toMatch(/iso2|correct/);
    let token: string | null = started.token;
    let q: QuestionView | null = started.question;
    let summary = null;
    let expectedCorrect = 0;
    let i = 0;
    while (q && token) {
      const iso = isoOf(q);
      const out = await answerPersistedGame(rpc, user, token, i % 2 === 0 ? 0 : 1);
      if ("error" in out) throw new Error(out.error);
      if (out.result.correct) expectedCorrect++;
      expect(out.result.country.iso2).toBe(iso);
      token = out.token;
      q = out.next;
      summary = out.summary;
      i++;
    }
    expect(i).toBe(10);
    expect(summary?.persisted).toBe(true);
    expect(summary?.correct).toBe(expectedCorrect);
    expect(summary?.review).toHaveLength(10);
    const { rows } = await db.query("select status, correct_count, total_questions, score from public.game_sessions where user_id = $1 order by started_at desc limit 1", [user]);
    expect(rows[0]).toMatchObject({ status: "completed", correct_count: expectedCorrect, total_questions: 10, score: summary?.score });
  });

  it("rejects replayed tokens (no second chance at a question)", async () => {
    const started = await startPersistedGame(rpc, user, "easy", { rng: seededRng(12) });
    const first = await answerPersistedGame(rpc, user, started.token, 0);
    expect("error" in first).toBe(false);
    const replay = await answerPersistedGame(rpc, user, started.token, 1);
    expect(replay).toEqual({ error: "conflict" });
  });

  it("binds tokens to their user", async () => {
    const started = await startPersistedGame(rpc, user, "hard", { rng: seededRng(13) });
    expect(await answerPersistedGame(rpc, other, started.token, 0)).toEqual({ error: "session_invalid" });
  });
});
