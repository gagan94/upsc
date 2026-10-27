import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { safeReturnTo } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const failed = () => NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  if (!code) return failed();
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed();
  } catch {
    return failed();
  }
  return NextResponse.redirect(new URL(safeReturnTo(url.searchParams.get("return_to")), url.origin));
}
