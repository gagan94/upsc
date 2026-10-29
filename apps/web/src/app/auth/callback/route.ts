import { NextResponse } from "next/server";
import { serverApi } from "@/lib/server-api";
import { createServerSupabase } from "@/lib/supabase-server";
import { safeReturnTo } from "@/lib/safe-redirect";
import type { OnboardingView } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const failed = () => NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  if (!code) return failed();
  let token: string | undefined;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed();
    token = data?.session?.access_token;
  } catch {
    return failed();
  }
  let target = safeReturnTo(url.searchParams.get("return_to"));
  try {
    const { status } = await serverApi<OnboardingView>("/me/onboarding", { token });
    if (status === "not_started") target = "/onboarding";
  } catch {
    // Onboarding lookup failed: keep the Phase 0 destination rather than blocking sign-in.
  }
  return NextResponse.redirect(new URL(target, url.origin));
}
