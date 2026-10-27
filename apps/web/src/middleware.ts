import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideRedirect } from "@/lib/route-guard";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  let signedIn = false;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
            list.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );
    // Validated against Supabase (never trust getSession() on the server). Fail closed on any error.
    const { data, error } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("auth timeout")), 3000)),
    ]);
    signedIn = !error && !!data.user;
  } catch {
    signedIn = false;
  }

  const { pathname, search } = request.nextUrl;
  const target = decideRedirect({ pathname, search, signedIn });
  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
