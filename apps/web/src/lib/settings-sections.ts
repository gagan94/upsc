// Neutral (no "use client"): shared by the server settings page and the client SettingsNav.
export const SETTINGS_SECTIONS = [
  { href: "/settings/profile", label: "My profile" },
  { href: "/settings/preparation", label: "Preparation profile" },
  { href: "/settings/study", label: "Study preferences" },
  { href: "/settings/appearance", label: "Appearance & accessibility" },
  { href: "/settings/account", label: "Account & contact" },
] as const;
