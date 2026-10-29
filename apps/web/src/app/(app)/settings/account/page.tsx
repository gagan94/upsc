import { AccountPanel } from "@/components/settings/AccountPanel";
import { loadOrNull, SectionError, SectionShell } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import type { ProfileView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const profile = await loadOrNull(() => serverApi<ProfileView>("/me/profile"));
  return (
    <SectionShell title="Account & contact">
      {profile ? <AccountPanel email={profile.email} /> : <SectionError href="/settings/account" />}
    </SectionShell>
  );
}
