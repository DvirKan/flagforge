import { describe, expect, it } from "vitest";
import { authErrorKey } from "@/lib/auth/errors";
import { loginSchema, registerSchema, safeNextPath } from "@/lib/validation/auth";

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/profile", "/profile"],
    ["/daily?x=1", "/daily?x=1"],
    ["//evil.com", "/profile"],
    ["https://evil.com", "/profile"],
    ["/\\evil.com", "/profile"],
    ["javascript:alert(1)", "/profile"],
    ["/ok\r\nSet-Cookie: x", "/profile"],
    [undefined, "/profile"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("registration validation", () => {
  it("normalizes and accepts valid input", () => {
    const r = registerSchema.parse({ username: "  Dvir_K ", email: " Dvir@Example.COM ", password: "longenough" });
    expect(r).toEqual({ username: "dvir_k", email: "dvir@example.com", password: "longenough" });
  });
  it("rejects bad usernames, emails and passwords with i18n keys", () => {
    const r = registerSchema.safeParse({ username: "a b", email: "nope", password: "short" });
    expect(r.success).toBe(false);
    const keys = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(keys).toEqual(expect.arrayContaining(["authErrors.usernameInvalid", "authErrors.invalidEmail", "authErrors.passwordTooShort"]));
    expect(registerSchema.safeParse({ username: "admin", email: "a@b.co", password: "longenough" }).success).toBe(false);
    expect(registerSchema.safeParse({ username: "ok_name", email: "a@b.co", password: "x".repeat(73) }).success).toBe(false);
  });
  it("login requires an email and a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("auth error mapping", () => {
  it("maps known codes and hides unknown ones", () => {
    expect(authErrorKey({ code: "invalid_credentials" })).toBe("authErrors.invalidCredentials");
    expect(authErrorKey({ code: "over_email_send_rate_limit" })).toBe("authErrors.rateLimited");
    expect(authErrorKey({ status: 429 })).toBe("authErrors.rateLimited");
    expect(authErrorKey({ code: "weird_internal" })).toBe("authErrors.generic");
  });
});
