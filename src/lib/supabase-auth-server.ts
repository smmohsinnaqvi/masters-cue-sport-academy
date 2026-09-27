import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import type { AcademySession, UserRole } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function createSupabaseAuthServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase Auth is not configured");
  }

  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export async function getAcademySession(): Promise<AcademySession | null> {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const role: unknown = data.user.app_metadata.role;
  if (role !== "admin" && role !== "supervisor") return null;

  return {
    role,
    email: data.user.email ?? "",
    name:
      (typeof data.user.user_metadata.full_name === "string" &&
        data.user.user_metadata.full_name) ||
      data.user.email ||
      "Staff",
  };
}

export async function requireAcademyRole(requiredRole: UserRole) {
  const session = await getAcademySession();
  if (!session || (requiredRole === "admin" && session.role !== "admin")) {
    throw new Error("Unauthorized");
  }
  return session;
}
