import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { SectionShell } from "@/components/settings/SettingsPage";

export default function AppearanceSettingsPage() {
  return (
    <SectionShell title="Appearance & accessibility" description="Theme, text size, contrast and motion.">
      <AppearanceForm />
    </SectionShell>
  );
}
