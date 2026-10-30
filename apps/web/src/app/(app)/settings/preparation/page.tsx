import { PreparationForm } from "@/components/settings/PreparationForm";
import { loadOrNull, SectionError, SectionShell } from "@/components/settings/SettingsPage";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { PrepProfileView, SubjectSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PreparationSettingsPage() {
  const profile = await loadOrNull(() => serverApi<PrepProfileView>("/me/preparation-profile"));
  // The subject list is secondary: if it fails the form still works.
  const subjects = profile
    ? await serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects")
        .then((r) => r.subjects)
        .catch((e) => {
          if (e instanceof ApiError) return null;
          throw e;
        })
    : null;
  return (
    <SectionShell title="Preparation profile" description="Your target, stage and focus. Used to personalise your plan.">
      {profile ? <PreparationForm initial={profile} subjects={subjects} /> : <SectionError href="/settings/preparation" />}
    </SectionShell>
  );
}
