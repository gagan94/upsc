"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ApiError, apiFetch } from "@/lib/api";
import type { QuestionImportResult } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS = 500;

export function ImportForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      setText(await file.text());
    } catch {
      setError("Couldn't read that file.");
    }
  }

  async function submit() {
    setResult(null);
    setError(null);
    if (new Blob([text]).size > MAX_BYTES) {
      setError("The payload is larger than 5 MB. Split it into smaller files.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("The text is not valid JSON.");
      return;
    }
    const items = (parsed as { items?: unknown } | null)?.items;
    if (typeof parsed !== "object" || parsed === null || !Array.isArray(items)) {
      setError('The JSON must be an object like {"items": [ ... ]}.');
      return;
    }
    if (items.length === 0 || items.length > MAX_ITEMS) {
      setError(`items must contain between 1 and ${MAX_ITEMS} questions.`);
      return;
    }
    setBusy(true);
    try {
      setResult(await apiFetch<QuestionImportResult>("/admin/questions/import", { method: "POST", body: JSON.stringify({ items }) }));
    } catch (e) {
      if (e instanceof ApiError && e.code === "payload_too_large") {
        setError("The payload is larger than 5 MB. Split it into smaller files.");
      } else {
        setError(e instanceof ApiError ? e.message : "Import failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted">
        Paste or upload JSON shaped like <code>{'{ "items": [ ... ] }'}</code> (up to 500 questions, 5 MB). Valid rows are saved as drafts;
        rows with errors are skipped and listed below.
      </p>
      <Field label="Upload a JSON file" type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
      <Field
        label="Questions JSON"
        multiline
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-mono"
        spellCheck={false}
      />
      <div>
        <Button onClick={submit} loading={busy} disabled={!text.trim()}>
          Validate and import
        </Button>
      </div>
      {error && <Banner tone="error">{error}</Banner>}
      {result && (
        <div className="flex flex-col gap-3">
          <Banner tone={result.created > 0 ? "success" : "info"}>
            {result.created} {result.created === 1 ? "question" : "questions"} created as drafts
          </Banner>
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-semibold">
                {result.errors.length} {result.errors.length === 1 ? "row had an error" : "rows had errors"}
              </p>
              <div className="mt-2 overflow-x-auto rounded-card border border-border bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-semibold">Item index</th>
                      <th scope="col" className="px-4 py-2 font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((er) => (
                      <tr key={`${er.index}-${er.message}`} className="border-b border-border last:border-0">
                        <td className="px-4 py-2">{er.index}</td>
                        <td className="px-4 py-2">{er.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
