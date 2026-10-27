import Link from "next/link";
import { redirect } from "next/navigation";
import { SubjectCard } from "@/components/SubjectCard";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { SubjectSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  let subjects: SubjectSummary[] | null = null;
  let unauthenticated = false;
  try {
    ({ subjects } = await serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"));
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) unauthenticated = true;
    else if (!(e instanceof ApiError)) throw e;
  }
  if (unauthenticated) redirect("/login");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Learn</h1>
        <p className="mt-1 text-sm text-muted">Choose a subject to start learning.</p>
      </div>
      {subjects === null ? (
        <div role="alert" className="rounded-card border border-danger-border bg-danger-bg p-4">
          <p className="text-sm text-danger">We couldn&apos;t load the subjects. Please try again.</p>
          <Link
            href="/learn"
            className="mt-3 inline-block rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text"
          >
            Try again
          </Link>
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <p className="font-semibold text-text">No subjects yet</p>
          <p className="mt-1 text-sm text-muted">Subjects will appear here as soon as they are published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-gap md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted">Lesson reader arrives in Phase 8</p>
    </div>
  );
}
