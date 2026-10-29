import { loadOrNull, SectionError, SectionShell } from "@/components/settings/SettingsPage";
import { StudyPrefsForm } from "@/components/settings/StudyPrefsForm";
import { serverApi } from "@/lib/server-api";
import type { StudyPrefsView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudySettingsPage() {
  const prefs = await loadOrNull(() => serverApi<StudyPrefsView>("/me/study-preferences"));
  return (
    <SectionShell title="Study preferences" description="Goals and routine used by your planner.">
      {prefs ? <StudyPrefsForm initial={prefs} /> : <SectionError href="/settings/study" />}
    </SectionShell>
  );
}
