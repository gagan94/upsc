"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, FormError, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/AuthCard";
import { authErrorMessage } from "@/lib/auth-errors";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { safeReturnTo } from "@/lib/safe-redirect";

function SignupForm() {
  const router = useRouter();
  const returnTo = useSearchParams().get("return_to");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!name.trim() || !email.trim() || !password) return setError("Fill in your name, email and password");
    if (password.length < 12) return setError("Password must be at least 12 characters");
    if (!accepted) return setError("Accept the terms and privacy to continue");
    setError(null);
    setPending(true);
    try {
      const { data, error: err } = await createBrowserSupabase().auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      });
      if (err) {
        setError(authErrorMessage((err as { code?: string }).code));
        setPending(false);
        return;
      }
      if (!data?.session) {
        setNotice("Check your email to confirm your account.");
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
    <AuthCard title="Create your account" helper="Start with your name and email. Preparation details come next.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError id="signup-error" message={error} />
        {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-[13px] font-semibold text-text">Name</label>
          <input id="name" autoComplete="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[13px] font-semibold text-text">Email</label>
          <input id="email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-[13px] font-semibold text-text">Password</label>
          <input id="password" type="password" autoComplete="new-password" aria-describedby="password-hint"
            className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p id="password-hint" className="text-[11px] text-muted">
            Use at least 12 characters. Choose a password you do not use elsewhere.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          Accept terms and privacy
        </label>
        <button type="submit" disabled={pending} className={primaryButtonClass}>Create account</button>
        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" ? (
          <button type="button" onClick={onGoogle} className={secondaryButtonClass}>Continue with Google</button>
        ) : null}
        <Link href="/login" className="text-center text-sm font-semibold text-primary">Already have an account?</Link>
      </form>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
