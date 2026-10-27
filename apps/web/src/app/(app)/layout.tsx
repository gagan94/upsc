import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { UserView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let user: UserView;
  try {
    ({ user } = await serverApi<{ user: UserView }>("/me"));
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div role="alert" className="max-w-md rounded-card border border-border bg-surface p-8 text-center">
          <h1 className="text-xl font-bold text-text">We couldn&apos;t load your workspace</h1>
          <p className="mt-2 text-sm text-muted">Something went wrong reaching the server. Please try again.</p>
          <Link
            href="/home"
            className="mt-4 inline-block rounded-control bg-primary px-4 py-2 font-semibold text-primary-text"
          >
            Try again
          </Link>
        </div>
      </main>
    );
  }
  return <AppShell user={user}>{children}</AppShell>;
}
