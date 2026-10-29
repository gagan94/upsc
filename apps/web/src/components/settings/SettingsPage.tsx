import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";

export const SETTINGS_ERROR_TEXT = "We couldn't load this page. Please try again.";

/** Heading + description shell shared by every settings section. */
export function SectionShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby="settings-heading" className="flex flex-col gap-4">
      <div>
        <h1 id="settings-heading" className="text-2xl font-bold text-text">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SectionError({ href }: { href: string }) {
  return (
    <div role="alert" className="rounded-card border border-danger-border bg-danger-bg p-4">
      <p className="text-sm text-danger">{SETTINGS_ERROR_TEXT}</p>
      <Link href={href} className="mt-3 inline-block rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">
        Try again
      </Link>
    </div>
  );
}

/**
 * Runs a server fetch. Returns the data, or null on an API failure (render <SectionError/>).
 * A 401 redirects to /login; non-API errors are rethrown.
 */
export async function loadOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  let unauthenticated = false;
  let data: T | null = null;
  try {
    data = await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) unauthenticated = true;
    else if (!(e instanceof ApiError)) throw e;
  }
  if (unauthenticated) redirect("/login");
  return data;
}
