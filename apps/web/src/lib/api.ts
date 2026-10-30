import { createBrowserSupabase } from "@/lib/supabase-browser";

export class ApiError extends Error {
  status: number;
  code: string;
  /** Extra fields of the error envelope (for example `active` on 409 session_conflict). */
  details: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Shared by apiFetch and serverApi: parse JSON or throw ApiError from the envelope. */
export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  let body: { error?: { code?: string; message?: string; [k: string]: unknown } } | undefined;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, "network_error", `Request failed (${res.status})`);
  }
  const e = body?.error;
  if (!e?.code) {
    throw new ApiError(res.status, "network_error", `Request failed (${res.status})`);
  }
  const { code, message, ...details } = e;
  throw new ApiError(res.status, code as string, (message as string | undefined) ?? (code as string), details);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  const { data } = await createBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "network_error", "Network request failed");
  }
  return parseResponse<T>(res);
}
