"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, UserCog } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

import { currentAcademySessionAction, loginAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/layout/page-state";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { fieldA11yProps } from "@/components/ui/field-utils";
import type { UserRole } from "@/lib/auth";
import { emailSchema } from "@/lib/form-validation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole =
    (searchParams.get("role") as UserRole | null) === "supervisor" ? "supervisor" : "admin";

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void currentAcademySessionAction().then((session) => {
      if (session) router.replace(session.role === "admin" ? "/admin" : "/supervisor");
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    const validEmail = emailSchema.safeParse(email);
    if (!validEmail.success) {
      setEmailError(validEmail.error.issues[0]?.message ?? "Enter a valid email address.");
      setPasswordError(password ? "" : "Enter your password.");
      return;
    }
    if (!password) {
      setEmailError("");
      setPasswordError("Enter your password.");
      return;
    }
    setEmailError("");
    setPasswordError("");
    setIsSubmitting(true);
    try {
      const result = await loginAction(validEmail.data, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(result.role === "admin" ? "/admin" : "/supervisor");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          <Field id="login-email" label="Email address" required error={emailError}>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              autoComplete="username"
              disabled={isSubmitting}
              className="min-h-12"
              required
              maxLength={254}
              {...fieldA11yProps("login-email", emailError)}
            />
          </Field>

          <Field id="login-password" label="Password" required error={passwordError}>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              autoComplete="current-password"
              disabled={isSubmitting}
              className="min-h-12"
              required
              {...fieldA11yProps("login-password", passwordError)}
            />
          </Field>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full min-h-12"
            loading={isSubmitting}
            loadingText="Signing in…"
          >
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
    <Suspense fallback={<PageLoading variant="login" />}>
      <LoginContent />
    </Suspense>
  );
}
