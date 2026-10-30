import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import type { UserView } from "@/lib/types";

export const dynamic = "force-dynamic";

const cards = [
  { href: "/admin/questions", title: "Questions", body: "Author, import, publish and verify Prelims questions.", adminOnly: false },
  { href: "/admin/question-reports", title: "Question reports", body: "Open issue reports from learners.", adminOnly: false },
  { href: "/admin/users", title: "Users", body: "Browse accounts, roles and status.", adminOnly: true },
  { href: "/admin/plans", title: "Plans & entitlements", body: "See what each plan includes.", adminOnly: true },
];

export default async function AdminHome() {
  const { user } = await serverApi<{ user: UserView }>("/me");
  const isAdmin = user.roles.includes("admin");
  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {cards
          .filter((c) => isAdmin || !c.adminOnly)
          .map((c) => (
            <Link key={c.href} href={c.href} className="rounded-card border border-border bg-surface p-5 hover:border-primary">
              <div className="font-semibold">{c.title}</div>
              <p className="mt-1 text-sm text-muted">{c.body}</p>
            </Link>
          ))}
      </div>
      <p className="mt-6 text-sm text-muted">Other sections arrive in later phases.</p>
    </div>
  );
}
