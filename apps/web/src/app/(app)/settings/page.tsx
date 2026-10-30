import Link from "next/link";
import { redirect } from "next/navigation";
import { SETTINGS_SECTIONS } from "@/components/settings/SettingsNav";

const LATER = [
  { label: "Notifications", note: "Choose which reminders and updates you receive." },
  { label: "Connected tools", note: "Link calendars and other apps." },
  { label: "Privacy & data", note: "Export or delete your data." },
];

export default async function SettingsIndexPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  // Compatibility with the Phase 0 `?section=` links.
  const { section } = await searchParams;
  const known = SETTINGS_SECTIONS.find((s) => s.href === `/settings/${section}`);
  if (known) redirect(known.href);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your profile, preparation and how the app looks.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block rounded-card border border-border bg-surface p-4 text-sm font-semibold text-text hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary">
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="later-heading" className="flex flex-col gap-2">
        <h2 id="later-heading" className="text-[13px] font-semibold uppercase tracking-wide text-muted">Coming later</h2>
        <ul className="flex flex-col gap-2">
          {LATER.map((l) => (
            <li key={l.label} className="rounded-card border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-text">{l.label}</p>
              <p className="text-xs text-muted">{l.note}</p>
              <p className="mt-1 text-xs font-semibold text-muted">Arrives in a later phase</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
