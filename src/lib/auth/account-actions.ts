"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors, profileSettingsSchema } from "@/lib/validation/auth";
import type { FormState } from "./form-state";

/** Updates the caller's own profile through RLS (the policy and column grants restrict what can change). */
export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { username: String(fd.get("username") ?? ""), displayName: String(fd.get("displayName") ?? "") };
  const parsed = profileSettingsSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) as FormState["fields"], values };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "auth.notConfigured", values };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { status: "error", message: "authErrors.sessionMissing", values };
  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data.username, display_name: parsed.data.displayName })
    .eq("id", userData.user.id);
  if (error) {
    if (error.code === "23505") return { status: "error", fields: { username: "authErrors.usernameTaken" }, values };
    if (error.code === "23514") return { status: "error", fields: { username: "authErrors.usernameInvalid" }, values };
    return { status: "error", message: "authErrors.generic", values };
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "settings.saved", values: { username: parsed.data.username, displayName: parsed.data.displayName ?? "" } };
}
