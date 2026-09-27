"use server";

import { createSupabaseAuthServerClient, getAcademySession } from "@/lib/supabase-auth-server";

export async function loginAction(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false as const, message: "Enter your email and password." };
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error) {
    console.error("[staff-login] Supabase sign-in rejected", {
      status: error.status,
      code: error.code,
    });
    if (error.code === "invalid_credentials") {
      return {
        ok: false as const,
        message:
          "Supabase rejected this email/password pair (invalid_credentials). Verify the password for this exact Auth user, then try again.",
        code: error.code,
      };
    }
    return {
      ok: false as const,
      message: `Supabase sign-in failed (${error.code ?? error.status ?? "unknown"}). Check the dev server terminal for the status code.`,
      code: error.code ?? "unknown",
    };
  }
  if (!data.user) {
    return { ok: false as const, message: "Supabase returned no user for this sign-in." };
  }

  const role: unknown = data.user.app_metadata.role;
  if (role !== "admin" && role !== "supervisor") {
    await supabase.auth.signOut();
    return {
      ok: false as const,
      message: "This account is not authorized for staff access.",
    };
  }

  return { ok: true as const, role };
}

export async function logoutAction() {
  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to sign out");
}

export async function currentAcademySessionAction() {
  return getAcademySession();
}
