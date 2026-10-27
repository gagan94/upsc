const PUBLIC_EXACT = ["/login", "/signup"];
const AUTH_ONLY_GUESTS = ["/login", "/signup"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.includes(pathname) || pathname === "/auth" || pathname.startsWith("/auth/");
}

/** Returns the path to redirect to, or null to continue. */
export function decideRedirect(args: { pathname: string; search: string; signedIn: boolean }): string | null {
  const { pathname, search, signedIn } = args;
  if (signedIn) return AUTH_ONLY_GUESTS.includes(pathname) ? "/home" : null;
  if (isPublicPath(pathname)) return null;
  return `/login?return_to=${encodeURIComponent(pathname + search)}`;
}
