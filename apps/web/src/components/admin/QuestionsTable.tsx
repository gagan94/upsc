"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api";
import { buildListQuery, type ListFilters } from "@/lib/question-form";
import type { PracticeSubject, QuestionAdminPage, QuestionAdminView } from "@/lib/types";
import { StatusBadge, VerificationBadge } from "./StatusBadge";

const DEFAULTS: ListFilters = { status: "all", subjectNodeId: "", sourceType: "", q: "" };
const SOURCE_LABEL: Record<string, string> = { platform: "Platform", pyq: "Previous year", ai_generated: "AI generated" };

export function QuestionsTable({ initial, subjects }: { initial: QuestionAdminPage; subjects: PracticeSubject[] }) {
  const [rows, setRows] = useState<QuestionAdminView[]>(initial.questions);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [draft, setDraft] = useState<ListFilters>(DEFAULTS);
  const [applied, setApplied] = useState<ListFilters>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleOf = (id: string) => subjects.find((s) => s.id === id)?.title ?? `${id.slice(0, 8)}…`;

  async function apply() {
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<QuestionAdminPage>(`/admin/questions?${buildListQuery(draft)}`);
      setRows(page.questions);
      setCursor(page.nextCursor);
      setApplied(draft);
    } catch {
      setError("Couldn't load questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<QuestionAdminPage>(`/admin/questions?${buildListQuery(applied, cursor)}`);
      setRows((prev) => [...prev, ...page.questions]);
      setCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = applied.status !== "all" || applied.subjectNodeId || applied.sourceType || applied.q;

  return (
    <div className="mt-4">
      <form
        className="grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          void apply();
        }}
      >
        <Select
          label="Status"
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          options={[
            { value: "all", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "retired", label: "Retired" },
          ]}
        />
        <Select
          label="Subject"
          value={draft.subjectNodeId}
          onChange={(e) => setDraft({ ...draft, subjectNodeId: e.target.value })}
          options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.title }))]}
        />
        <Select
          label="Source"
          value={draft.sourceType}
          onChange={(e) => setDraft({ ...draft, sourceType: e.target.value })}
          options={[
            { value: "", label: "All sources" },
            { value: "platform", label: "Platform" },
            { value: "pyq", label: "Previous year" },
            { value: "ai_generated", label: "AI generated" },
          ]}
        />
        <Field label="Search stems" value={draft.q} maxLength={200} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" loading={loading}>
            Apply filters
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{filtered ? "No questions match these filters" : "No questions yet"}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Question</th>
                <th scope="col" className="px-4 py-2 font-semibold">Subject</th>
                <th scope="col" className="px-4 py-2 font-semibold">Source</th>
                <th scope="col" className="px-4 py-2 font-semibold">Difficulty</th>
                <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2 font-semibold">Verification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-border last:border-0">
                  <td className="max-w-md px-4 py-2">
                    <Link href={`/admin/questions/${q.id}`} className="font-medium text-primary underline">
                      {q.stem.length > 120 ? `${q.stem.slice(0, 120)}…` : q.stem}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{titleOf(q.subjectNodeId)}</td>
                  <td className="px-4 py-2">{SOURCE_LABEL[q.sourceType] ?? q.sourceType}</td>
                  <td className="px-4 py-2 capitalize">{q.difficulty}</td>
                  <td className="px-4 py-2"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-2"><VerificationBadge status={q.verificationStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {cursor && (
        <Button className="mt-4" onClick={loadMore} loading={loading}>
          Load more
        </Button>
      )}
    </div>
  );
}
