import { ProfileForm } from "@/components/settings/ProfileForm";
import { loadOrNull, SectionError, SectionShell } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import type { ProfileView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const profile = await loadOrNull(() => serverApi<ProfileView>("/me/profile"));
  return (
    <SectionShell title="My profile" description="How you appear in the app.">
      {profile ? <ProfileForm initial={profile} /> : <SectionError href="/settings/profile" />}
    </SectionShell>
  );
}
