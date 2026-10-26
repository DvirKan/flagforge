# Server API

All mutations are `POST` with a JSON body, validated by Zod (`.strict()` — unknown fields are rejected), limited to
8 KiB, and rate-limited per client IP (best-effort, per server instance). Responses are `Cache-Control: no-store`.
Errors have the shape `{ "error": code }` and never include stack traces or internal messages.

| Status | `error` | Meaning |
|---|---|---|
| 400 | `invalid_request` | Malformed JSON or schema violation |
| 400 | `session_invalid` | Token forged, tampered or unreadable |
| 409 | `conflict` | Game already finished |
| 410 | `session_expired` | Token older than 2 hours |
| 413 | `payload_too_large` | Body > 8 KiB |
| 429 | `rate_limited` | `Retry-After` header gives seconds |
| 500 | `internal` | Logged server-side |

## Standard game (Phase 2 — guests)

### `POST /api/game/start`

Request: `{ "difficulty": "easy" | "medium" | "hard" }` — rate limit 30/min.

Response:
```ts
{
  token: string;           // AES-256-GCM sealed game state (opaque)
  question: {
    index: number;         // 0-based
    total: number;         // 10
    flagUrl: string;       // /api/game/flag/<opaque handle>
    options: { name: { en: string; he: string } }[]; // 4, display order
  };
}
```
The response never contains ISO codes or which option is correct.

### `POST /api/game/answer`

Request: `{ "token": string, "choice": 0 | 1 | 2 | 3 }` — rate limit 120/min.

Response:
```ts
{
  token: string | null;    // next state; null when the game is over
  result: { correct: boolean; chosenIndex: number; correctIndex: number;
            country: { iso2, continent, name, capital, fact } };
  next: Question | null;
  summary: null | { difficulty, correct, total, accuracyPct, elapsedMs, score, tier,
                    review: { flagUrl, correct, country, chosen }[] };
}
```
Correctness, timing and score are computed on the server. `elapsedMs` = server time from start to last answer.

### `GET /api/game/flag/:handle`

Serves a sanitized SVG for an encrypted, expiring (6 h) handle. Each handle is unique even for the same country.
Headers: `Content-Type: image/svg+xml`, `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`.

### Known limitation (by design)

Guest game state is client-held, so it cannot be "spent": replaying an earlier token re-answers that question.
Guest results are never persisted or ranked, so this only affects the guest's own screen. Authenticated games
(Phase 3) and the daily challenge (Phase 4) keep authoritative state in PostgreSQL.
