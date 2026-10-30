import "server-only";
import { ApiError, parseResponse } from "@/lib/api";
import { createServerSupabase } from "@/lib/supabase-server";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

/** `opts.token` lets a caller that just obtained a session (auth callback) skip the cookie round trip. */
export async function serverApi<T>(path: string, opts: { token?: string } = {}): Promise<T> {
  let token = opts.token;
  if (!token) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  }
  if (!token) throw new ApiError(401, "unauthenticated", "Not signed in");

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network_error", "Network request failed");
  }
  return parseResponse<T>(res);
}
