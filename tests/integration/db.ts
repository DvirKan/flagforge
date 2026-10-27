import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

/**
 * Integration-test database helper. Recreates a throwaway database, applies the test-only Supabase shim and
 * then every migration in supabase/migrations in order — exactly what `supabase db push` would apply.
 *
 * Requires TEST_DATABASE_URL pointing at a PostgreSQL ≥ 15 server where the user may create databases,
 * e.g. postgres://postgres@127.0.0.1:54322/postgres . Tests are skipped when it is not set.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const DB_NAME = "flagforge_test";
const root = process.cwd();

export async function resetDatabase(): Promise<string> {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  const admin = new Client({ connectionString: TEST_DATABASE_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${DB_NAME} with (force)`);
  await admin.query(`create database ${DB_NAME}`);
  await admin.end();

  const url = new URL(TEST_DATABASE_URL);
  url.pathname = `/${DB_NAME}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  await client.query(readFileSync(join(root, "supabase/tests/local-shim.sql"), "utf8"));
  const dir = join(root, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await client.query(readFileSync(join(dir, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  await client.end();
  return url.toString();
}

export type Role = "anon" | "authenticated" | "service_role";

/** Runs `fn` inside a transaction as a PostgREST-style role (and user id), then rolls back unless `commit`. */
export async function as<T>(client: Client, role: Role, userId: string | null, fn: () => Promise<T>, commit = false): Promise<T> {
  await client.query("begin");
  try {
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const result = await fn();
    await client.query(commit ? "commit" : "rollback");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

/** Expects `fn` to fail; returns the PostgreSQL error message. */
export async function failure(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error("expected the operation to fail, but it succeeded");
}

/** Creates a signed-up user the same way Supabase Auth does (insert into auth.users fires the profile trigger). */
export async function createUser(client: Client, email: string, username?: string, lang = "en"): Promise<string> {
  const { rows } = await client.query(
    "insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ($1, $2, now()) returning id",
    [email, JSON.stringify({ username, preferred_language: lang })],
  );
  return rows[0].id as string;
}
