import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";
import { adminOnlyApi } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const data = await adminOnlyApi<{ users: AdminUserRow[]; nextCursor: string | null }>("/admin/users?limit=25");
  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <UsersTable initialUsers={data.users} initialCursor={data.nextCursor} />
    </div>
  );
}
