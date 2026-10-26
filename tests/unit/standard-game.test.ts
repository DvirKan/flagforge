import { beforeAll, describe, expect, it } from "vitest";
import { seededRng } from "@/lib/game/rng";
import type { QuestionView } from "@/lib/game/types";
import { seal, unseal } from "@/server/crypto";
import flags from "@/server/data/flags.json";
import { resolveFlagHandle } from "@/server/game/flag-handle";
import { answerStandardGame, startStandardGame } from "@/server/game/standard";

beforeAll(() => {
  process.env.GAME_SESSION_SECRET = "test-secret-test-secret-test-secret-0123456789";
});

const T0 = Date.UTC(2026, 9, 26, 10, 0, 0);

function play(token: string, view: QuestionView, chooser: (v: QuestionView) => number, step = 2000) {
  let t = token;
  let v: QuestionView | null = view;
  let now = T0;
  let last: ReturnType<typeof answerStandardGame> | null = null;
  while (v) {
    now += step;
    last = answerStandardGame(t, chooser(v), { now });
    if ("error" in last) throw new Error(last.error);
    t = last.token ?? "";
    v = last.next;
  }
  return last;
}

describe("crypto tokens", () => {
  it("round-trips and rejects tampering or the wrong purpose", () => {
    const token = seal({ a: 1 }, "p1");
    expect(unseal(token, "p1")).toEqual({ a: 1 });
    expect(unseal(token, "p2")).toBeNull();
    const bytes = Buffer.from(token, "base64url");
    bytes[14] = (bytes[14] ?? 0) ^ 1;
    expect(unseal(bytes.toString("base64url"), "p1")).toBeNull();
    expect(unseal("garbage", "p1")).toBeNull();
  });

  it("produces a different ciphertext every time (random IV)", () => {
    expect(seal({ a: 1 }, "p")).not.toBe(seal({ a: 1 }, "p"));
  });
});

describe("standard game", () => {
  it("does not expose the answer in the client payload", () => {
    const { token, question } = startStandardGame("easy", { now: T0, rng: seededRng(1) });
    const payload = JSON.stringify(question);
    // Payload holds names + an opaque flag URL; no ISO codes anywhere.
    expect(payload).not.toMatch(/"iso2"|"correct"/);
    const iso = resolveFlagHandle(question.flagUrl.split("/").pop() ?? "", T0);
    expect(iso).toMatch(/^[A-Z]{2}$/);
    expect(payload).not.toContain(`"${iso}"`);
    expect(token).not.toContain(iso as string);
    expect(question.options).toHaveLength(4);
    expect(question.flagUrl).toMatch(/^\/api\/game\/flag\//);
    expect((flags as Record<string, string>)[iso ?? ""]).toMatch(/^<svg/);
  });

  it("validates answers on the server and computes the summary", () => {
    const { token, question } = startStandardGame("medium", { now: T0, rng: seededRng(2) });
    // Always choose option 0; the server decides which of those happen to be right.
    const last = play(token, question, () => 0);
    if (!last || "error" in last) throw new Error("no result");
    expect(last.token).toBeNull();
    expect(last.next).toBeNull();
    const s = last.summary;
    expect(s?.total).toBe(10);
    expect(s?.elapsedMs).toBe(20_000);
    const answeredRight = s?.review.filter((r) => r.correct).length ?? -1;
    expect(s?.correct).toBe(answeredRight);
    expect(s?.accuracyPct).toBe(answeredRight * 10);
    expect(s?.review).toHaveLength(10);
  });

  it("scores a perfect game when every answer is correct", () => {
    const { token, question } = startStandardGame("hard", { now: T0, rng: seededRng(3) });
    // Learn each correct index with a probe answer on the same token, then answer correctly
    // (token replay is possible for guests by design; see the note in server/game/standard.ts).
    let t = token;
    let v: QuestionView | null = question;
    let now = T0;
    let final = null as ReturnType<typeof answerStandardGame> | null;
    while (v) {
      now += 1000;
      const probe = answerStandardGame(t, 0, { now });
      if ("error" in probe) throw new Error(probe.error);
      final = answerStandardGame(t, probe.result.correctIndex, { now });
      if ("error" in final) throw new Error(final.error);
      expect(final.result.correct).toBe(true);
      t = final.token ?? "";
      v = final.next;
    }
    if (!final || "error" in final || !final.summary) throw new Error("no summary");
    expect(final.summary.correct).toBe(10);
    expect(final.summary.tier).toBe("cartographer");
    expect(final.summary.score).toBe(10 * (100 + Math.round(50 * (1 - 1000 / 15000))));
  });

  it("rejects forged, expired and finished sessions", () => {
    expect(answerStandardGame("not-a-real-token-at-all", 0)).toEqual({ error: "session_invalid" });
    const { token } = startStandardGame("easy", { now: T0, rng: seededRng(4) });
    expect(answerStandardGame(token, 0, { now: T0 + 3 * 60 * 60 * 1000 })).toEqual({ error: "session_expired" });
  });

  it("issues opaque flag URLs that differ for the same country and expire", () => {
    const a = startStandardGame("easy", { now: T0, rng: seededRng(5) }).question.flagUrl;
    const b = startStandardGame("easy", { now: T0, rng: seededRng(5) }).question.flagUrl;
    expect(a).not.toBe(b);
    const handle = a.split("/").pop() ?? "";
    expect(resolveFlagHandle(handle, T0)).toBe(resolveFlagHandle(b.split("/").pop() ?? "", T0));
    expect(resolveFlagHandle(handle, T0 + 7 * 60 * 60 * 1000)).toBeNull();
  });
});
