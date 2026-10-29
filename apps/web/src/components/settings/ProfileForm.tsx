"use client";

import { useMemo, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import type { ProfilePatch, ProfileView } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { SaveFeedback } from "./SaveFeedback";
import { useSaveState } from "./useSaveState";

const FALLBACK_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function timezoneOptions(current: string): { value: string; label: string }[] {
  let zones = FALLBACK_ZONES;
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (all?.length) zones = all;
  } catch {
    // keep the fallback list
  }
  const set = new Set(zones);
  set.add(current);
  if (!set.has("UTC")) set.add("UTC");
  return [...set].sort().map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
}

export function ProfileForm({ initial }: { initial: ProfileView }) {
  const [base, setBase] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [timezone, setTimezone] = useState(initial.timezone);
  const [touched, setTouched] = useState(false);
  const { state, run, reset } = useSaveState();
  const zones = useMemo(() => timezoneOptions(initial.timezone), [initial.timezone]);

  const nameError = !name.trim() ? "Enter your name" : name.trim().length > 80 ? "Use 80 characters or fewer" : null;
  const bioError = bio.length > 500 ? "Use 500 characters or fewer" : null;

  const patch: ProfilePatch = {};
  if (name.trim() !== base.name) patch.name = name.trim();
  if ((bio.trim() || null) !== base.bio) patch.bio = bio.trim() || null;
  if ((location.trim() || null) !== base.location) patch.location = location.trim() || null;
  if (timezone !== base.timezone) patch.timezone = timezone;
  const dirty = Object.keys(patch).length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError || bioError || !dirty) return;
    const sent = patch;
    const ok = await run(async () => {
      await apiFetch("/me", { method: "PATCH", body: JSON.stringify(sent) });
    });
    if (ok) setBase((b) => ({ ...b, ...sent }));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-4" onChange={reset}>
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} error={touched ? nameError : null} autoComplete="name" />
      <Field label="Email" value={base.email} readOnly hint="Your sign-in email. It cannot be changed here." />
      <Field
        label="Bio"
        multiline
        rows={3}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        hint="Up to 500 characters."
        error={touched ? bioError : null}
      />
      <Field label="Location" value={location} onChange={(e) => setLocation(e.target.value)} autoComplete="address-level2" />
      <Select label="Time zone" options={zones} value={timezone} onChange={(e) => setTimezone(e.target.value)} hint="Days and weeks in your planner follow this time zone." />
      <SaveFeedback state={state} savedText="Profile saved." />
      <div>
        <Button type="submit" loading={state.kind === "saving"} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
