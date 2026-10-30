import Link from "next/link";
import { BuilderForm } from "@/components/practice/BuilderForm";
import { SectionError, loadOrNull } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import type { PracticeSubject } from "@/lib/types";

export const dynamic = "force-dynamic";

/** `?subject=<syllabusNodeId>` preselects a subject; `?source=pyq|mixed` preselects the source. */
export default async function NewPracticePage({ searchParams }: { searchParams: Promise<{ subject?: string; source?: string }> }) {
  const sp = await searchParams;
  const data = await loadOrNull(() => serverApi<{ subjects: PracticeSubject[] }>("/practice/subjects"));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/prelims" className="text-sm font-semibold text-primary hover:underline">Back to Prelims</Link>
        <h1 className="mt-2 text-2xl font-bold text-text">New practice set</h1>
        <p className="mt-1 text-sm text-muted">Sample questions: the current question bank is sample data.</p>
      </div>
      {data === null ? <SectionError href="/prelims/new" /> : <BuilderForm subjects={data.subjects} initialSubject={sp.subject} initialSource={sp.source} />}
    </div>
  );
}
