"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, FormError, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/AuthCard";
import { authErrorMessage } from "@/lib/auth-errors";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { safeReturnTo } from "@/lib/safe-redirect";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return_to");
  const queryError = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(queryError ? authErrorMessage(queryError) : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { error: err } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
      if (err) {
        setError(authErrorMessage((err as { code?: string }).code));
        setPending(false);
        return;
      }
      router.replace(safeReturnTo(returnTo));
    } catch {
      setError(authErrorMessage(null));
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`;
    const { error: err } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (err) setError(authErrorMessage((err as { code?: string }).code));
  }

  return (
    <AuthCard title="Log in">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError id="login-error" message={error} />
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[13px] font-semibold text-text">Email</label>
          <input id="email" type="email" autoComplete="email" className={inputClass} value={email}
            onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? "login-error" : undefined} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-[13px] font-semibold text-text">Password</label>
          <input id="password" type="password" autoComplete="current-password" className={inputClass}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={pending} className={primaryButtonClass}>Log in</button>
        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" ? (
          <button type="button" onClick={onGoogle} className={secondaryButtonClass}>Continue with Google</button>
        ) : null}
        <Link href="/signup" className="text-center text-sm font-semibold text-primary">Create an account</Link>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
