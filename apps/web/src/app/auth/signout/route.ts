import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Signs the user out server-side and sends them to /login with an explanation.
 * Used when the API rejects a session that Supabase still accepts, which would
 * otherwise loop between the layouts (-> /login) and the middleware (-> /home).
 * Public under /auth/* in the route guard.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch {
    // Best effort: still leave the app; the login page explains what happened.
  }
  return NextResponse.redirect(new URL("/login?error=session_rejected", request.url), 303);
}
