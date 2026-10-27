"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Page {
  users: AdminUserRow[];
  nextCursor: string | null;
}

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** Whitelist only the columns we display; drop anything else the payload carries. */
function pick(u: AdminUserRow): AdminUserRow {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    roles: u.roles,
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

export function UsersTable({ initialUsers, initialCursor }: { initialUsers: AdminUserRow[]; initialCursor: string | null }) {
  const [users, setUsers] = useState(() => initialUsers.map(pick));
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<Page>(`/admin/users?limit=25&cursor=${encodeURIComponent(cursor)}`);
      setUsers((prev) => [...prev, ...page.users.map(pick)]);
      setCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (users.length === 0) return <p className="mt-4 text-sm text-muted">No users yet</p>;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Name</th>
              <th scope="col" className="px-4 py-2 font-semibold">Email</th>
              <th scope="col" className="px-4 py-2 font-semibold">Roles</th>
              <th scope="col" className="px-4 py-2 font-semibold">Status</th>
              <th scope="col" className="px-4 py-2 font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span key={r} className="rounded-control border border-border bg-bg px-2 py-0.5 text-xs">
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">{u.status}</td>
                <td className="px-4 py-2">{u.lastLoginAt ? fmt.format(new Date(u.lastLoginAt)) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-4 rounded-control bg-primary px-4 py-2 font-semibold text-primary-text disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
