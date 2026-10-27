import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { UserView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let user: UserView;
  try {
    ({ user } = await serverApi<{ user: UserView }>("/me"));
  } catch (e) {
    // redirect() throws NEXT_REDIRECT; it is in the catch clause, never inside a try, so nothing swallows it.
    // The API rejected a session Supabase still accepts: sign out instead of looping via /login.
    if (e instanceof ApiError && e.status === 401) redirect("/auth/signout");
    return <ErrorPanel title={"We couldn't load your workspace"} />;
  }
  return <AppShell user={user}>{children}</AppShell>;
}
