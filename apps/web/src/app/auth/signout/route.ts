import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Signs the user out server-side and sends them to /login with an explanation.
 * Used when the API rejects a session that Supabase still accepts, which would
 * otherwise loop between the layouts (-> /login) and the middleware (-> /home).
 * With `?done=1` (the user chose "Log out") it lands on a clean /login instead.
 * Public under /auth/* in the route guard.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch {
    // Best effort: still leave the app; the login page explains what happened.
  }
  const chosen = new URL(request.url).searchParams.get("done") === "1";
  return NextResponse.redirect(new URL(chosen ? "/login" : "/login?error=session_rejected", request.url), 303);
}
