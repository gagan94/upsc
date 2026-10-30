"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export const REASONING_MAX = 1000;

/** The learner's own note about a question. Plain text, saved on request; nothing here is generated. */
export function ReasoningBox({ sessionId, ordinal, initial }: { sessionId: string; ordinal: number; initial: string | null }) {
  const [text, setText] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    try {
      await apiFetch(`/practice/sessions/${encodeURIComponent(sessionId)}/questions/${ordinal}/reasoning`, {
        method: "PUT",
        body: JSON.stringify({ text }),
      });
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <section aria-labelledby="think-h" className="flex flex-col gap-2">
      <h2 id="think-h" className="text-base font-bold text-text">Your notes</h2>
      <Field
        multiline
        label="Analyse my thinking"
        hint="Write down why you chose your answer. This note is only for you."
        rows={4}
        maxLength={REASONING_MAX}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (state !== "idle") setState("idle");
        }}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" loading={state === "saving"} onClick={save}>Save note</Button>
        {state === "saved" ? <span role="status" className="text-sm font-semibold text-primary">Saved</span> : null}
        {state === "error" ? <span role="alert" className="text-sm font-semibold text-danger">We couldn&apos;t save your note. Please try again.</span> : null}
      </div>
    </section>
  );
}
