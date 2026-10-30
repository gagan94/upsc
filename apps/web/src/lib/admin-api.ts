import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";

/**
 * serverApi for admin-only pages. The admin layout also admits `content_editor`, but the API enforces
 * roles per route, so an editor reaching an admin-only page gets 403 and is sent to the question bank.
 */
export async function adminOnlyApi<T>(path: string): Promise<T> {
  try {
    return await serverApi<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) redirect("/admin/questions");
    throw e;
  }
}
