import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/AdminNav";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { UserView } from "@/lib/types";

export const dynamic = "force-dynamic";

type Outcome = { kind: "ok"; user: UserView } | { kind: "unauth" } | { kind: "error" };

async function loadUser(): Promise<Outcome> {
  try {
    const { user } = await serverApi<{ user: UserView }>("/me");
    return { kind: "ok", user };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { kind: "unauth" };
    return { kind: "error" };
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const outcome = await loadUser();
  // redirect() throws; it is deliberately called outside any try/catch.
  if (outcome.kind === "unauth") redirect("/login?return_to=%2Fadmin");
  if (outcome.kind === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div role="alert" className="max-w-md rounded-card border border-border bg-surface p-8 text-center">
          <h1 className="text-xl font-bold text-text">We couldn&apos;t load the admin console</h1>
          <p className="mt-2 text-sm text-muted">Something went wrong reaching the server. Please try again.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-control bg-primary px-4 py-2 font-semibold text-primary-text">
            Try again
          </Link>
        </div>
      </main>
    );
  }
  const { user } = outcome;
  if (!user.roles.includes("admin")) redirect("/home");

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <aside className="hidden w-64 shrink-0 bg-sidebar md:block">
        <div className="px-7 pt-5 text-lg font-bold text-surface">Admin</div>
        <AdminNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
          <span className="font-semibold">AI UPSC · Admin</span>
          <div className="flex items-center gap-4 text-sm">
            <span>{user.name}</span>
            <Link href="/home" className="font-medium text-primary underline">
              Back to app
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
