"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, UserCog } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDemoCredentials, getStoredSession, loginWithRole, type UserRole } from "@/lib/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole =
    (searchParams.get("role") as UserRole | null) === "supervisor" ? "supervisor" : "admin";

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace(session.role === "admin" ? "/admin" : "/supervisor");
    }
  }, [router]);

  const credentials = useMemo(() => getDemoCredentials(role), [role]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const result = loginWithRole(role, email, password);
    if (!result.ok) {
      setError(result.message || "Login failed.");
      return;
    }

    router.replace(role === "admin" ? "/admin" : "/supervisor");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-felt)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Academy access
            </p>
            <h1 className="mt-2 text-3xl font-bold">Login</h1>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-felt/30 bg-felt/15 text-felt">
            {role === "admin" ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <UserCog className="h-5 w-5" />
            )}
          </div>
        </div>

        <div className="mb-5 inline-flex w-full rounded-lg border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={
              "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors " +
              (role === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole("supervisor")}
            className={
              "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors " +
              (role === "supervisor"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground")
            }
          >
            Supervisor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={credentials.email}
              className="min-h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="min-h-12"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-background/80 p-3 text-xs text-muted-foreground">
            Demo login: {credentials.email} / {credentials.password}
          </div>

          <Button type="submit" className="w-full min-h-12">
            Continue as {role === "admin" ? "Admin" : "Supervisor"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Need a public view?{" "}
          <Link href="/" className="text-felt underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading login...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
