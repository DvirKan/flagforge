import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.skip(!url || !publishable || !secret, "Supabase URL, publishable key and secret key are required");

const configured = Boolean(url && publishable && secret);
// Placeholder URL keeps module evaluation safe when the suite is skipped.
const admin = createClient(configured ? url : "http://localhost:54321", configured ? secret : "unset", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const run = Date.now().toString(36);
const created: string[] = [];

// example.com is reserved (RFC 2606). Users are created via the admin API, so no email is ever sent.
const email = (tag: string) => `ff-e2e-${tag}-${run}@example.com`;
const PASSWORD = `E2e-${run}-pass!`;

async function createConfirmedUser(tag: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(tag),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: `e2e_${tag}_${run}`.slice(0, 20), preferred_language: "en" },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  created.push(data.user.id);
  return data.user;
}

async function login(page: Page, address: string, password = PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", address);
  await page.fill("#password", password);
  await page.click("main form button[type=submit]");
  await page.waitForURL(/\/profile/);
}

test.afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => undefined);
});

test("profile is created on signup and the email verification link signs the user in", async ({ page }) => {
  const address = email("verify");
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: address,
    password: PASSWORD,
    options: { data: { username: `e2e_v_${run}`.slice(0, 20) } },
  });
  expect(error).toBeNull();
  if (data.user) created.push(data.user.id);
  // Unconfirmed users cannot sign in.
  await page.goto("/login");
  await page.fill("#email", address);
  await page.fill("#password", PASSWORD);
  await page.click("main form button[type=submit]");
  await expect(page.locator("main form [role=alert]")).toContainText("Confirm your email");
  // The link our email template points to.
  await page.goto(`/auth/confirm?token_hash=${data.properties?.hashed_token}&type=signup&next=${encodeURIComponent("/profile?welcome=1")}`);
  await expect(page).toHaveURL(/\/profile\?welcome=1/);
  await expect(page.getByText("Your email is confirmed")).toBeVisible();
  await expect(page.locator("main").getByText(`@e2e_v_${run}`.slice(0, 21))).toBeVisible();
});

test("a signed-in player's game is saved and appears on the profile", async ({ page }) => {
  const user = await createConfirmedUser("play");
  await login(page, user.email ?? "");
  await page.goto("/play/easy");
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Question ${i} of 10`)).toBeVisible();
    await page.getByRole("group", { name: "Which country does this flag belong to?" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 10 ? "See results" : "Next flag" }).click();
  }
  await expect(page.getByText("Saved to your profile.")).toBeVisible();
  const { data: sessions } = await admin.from("game_sessions").select("status, total_questions, correct_count").eq("user_id", user.id);
  expect(sessions).toHaveLength(1);
  expect(sessions?.[0]).toMatchObject({ status: "completed", total_questions: 10 });
  await page.goto("/profile");
  await expect(page.locator("table tbody tr")).toHaveCount(1);
});

test("language preference is stored on the profile", async ({ page }) => {
  const user = await createConfirmedUser("lang");
  await login(page, user.email ?? "");
  await page.getByRole("button", { name: /switch language to עברית/i }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect.poll(async () => (await admin.from("profiles").select("preferred_language").eq("id", user.id).single()).data?.preferred_language).toBe("he");
});

test("password recovery link lets the user set a new password", async ({ page }) => {
  const user = await createConfirmedUser("reset");
  const { data } = await admin.auth.admin.generateLink({ type: "recovery", email: user.email ?? "" });
  await page.goto(`/auth/confirm?token_hash=${data.properties?.hashed_token}&type=recovery`);
  await expect(page).toHaveURL(/\/reset-password/);
  const newPassword = `${PASSWORD}-new`;
  await page.fill("#password", newPassword);
  await page.click("main form button[type=submit]");
  await expect(page).toHaveURL(/\/profile\?password=updated/);
  await page.context().clearCookies();
  await login(page, user.email ?? "", newPassword);
});

test("signed-in users cannot forge results or reach admin", async ({ page }) => {
  const user = await createConfirmedUser("sec");
  const client = createClient(url, publishable, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email: user.email ?? "", password: PASSWORD });
  expect(signInError).toBeNull();
  const start = await client.rpc("start_standard_game", { p_user_id: user.id, p_difficulty: "easy", p_questions: [] });
  expect(start.error).not.toBeNull();
  const insert = await client.from("game_sessions").insert({ user_id: user.id, difficulty: "easy", total_questions: 10 });
  expect(insert.error).not.toBeNull();
  const roles = await client.from("user_roles").insert({ user_id: user.id, role: "admin" });
  expect(roles.error).not.toBeNull();
  const others = await client.from("profiles").select("id");
  expect(others.data).toHaveLength(1); // only their own row
  await login(page, user.email ?? "");
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});

test("account deletion removes the user and their data", async ({ page }) => {
  const user = await createConfirmedUser("del");
  await login(page, user.email ?? "");
  const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).single();
  await page.goto("/settings");
  await page.fill("#confirm", "wrong-name");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.locator("#confirm-error")).toBeVisible();
  await page.fill("#confirm", profile?.username ?? "");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/account=deleted/);
  const { data } = await admin.auth.admin.getUserById(user.id);
  expect(data.user).toBeNull();
  const { data: rows } = await admin.from("profiles").select("id").eq("id", user.id);
  expect(rows).toHaveLength(0);
});

async function ensureTodayChallenge() {
  const { data: today } = await admin.rpc("challenge_today");
  const { data: overview } = await admin.rpc("daily_challenge_overview", { p_from: today, p_to: today });
  if (overview?.[0]?.status === "published") return;
  // Same shape the prepare script produces; the database validates before publishing.
  const questions = [
    { country: "JP", difficulty: "easy", options: ["JP", "KR", "CN", "VN"] },
    { country: "FR", difficulty: "easy", options: ["IT", "FR", "BE", "IE"] },
    { country: "KZ", difficulty: "medium", options: ["UZ", "KG", "KZ", "MN"] },
    { country: "UY", difficulty: "medium", options: ["AR", "PY", "CL", "UY"] },
    { country: "KM", difficulty: "hard", options: ["KM", "MU", "SC", "MG"] },
  ];
  const { data: id, error } = await admin.rpc("upsert_daily_challenge_draft", { p_date: today, p_questions: questions });
  if (error) throw new Error(error.message);
  const { error: pubError } = await admin.rpc("publish_daily_challenge", { p_challenge_id: id });
  if (pubError) throw new Error(pubError.message);
}

test("daily challenge: one attempt, refresh resumes, result is ranked", async ({ page }) => {
  await ensureTodayChallenge();
  const user = await createConfirmedUser("daily");
  await login(page, user.email ?? "");
  await page.goto("/daily");
  await page.getByRole("link", { name: "Start today's challenge" }).click();
  await expect(page).toHaveURL(/\/daily\/play/);
  const options = () => page.getByRole("group", { name: "Which country does this flag belong to?" }).getByRole("button");

  await expect(page.getByText("Question 1 of 5")).toBeVisible();
  await options().first().click();
  await expect(page.getByText("Question 2 of 5")).toBeVisible();

  // Refresh mid-attempt: same attempt, next question, clock not reset.
  await page.reload();
  await expect(page.getByText("Question 2 of 5")).toBeVisible();

  for (let i = 2; i <= 5; i++) {
    await expect(page.getByText(`Question ${i} of 5`)).toBeVisible();
    await options().first().click();
  }
  await expect(page.locator("#daily-result")).toBeVisible();

  const { data: attempts } = await admin.from("daily_attempts").select("status, correct_count, elapsed_ms").eq("user_id", user.id);
  expect(attempts).toHaveLength(1);
  expect(attempts?.[0]?.status).toBe("completed");

  // Second visit: no new attempt, result shown; the player appears in today's standings.
  await page.goto("/daily/play");
  await expect(page.locator("#daily-result")).toBeVisible();
  const { data: again } = await admin.from("daily_attempts").select("id").eq("user_id", user.id);
  expect(again).toHaveLength(1);
  await page.goto("/daily");
  await expect(page.locator("main table")).toContainText(`@e2e_daily_${run}`.slice(0, 21));
});

test("guests cannot start a ranked daily attempt", async ({ page, request }) => {
  await ensureTodayChallenge();
  await page.goto("/daily");
  await expect(page.getByRole("link", { name: "Sign in to start a ranked attempt" })).toBeVisible();
  const res = await request.post("/api/daily/start");
  expect(res.status()).toBe(401);
  await page.goto("/daily/play");
  await expect(page).toHaveURL(/\/login\?next=%2Fdaily%2Fplay/);
});
