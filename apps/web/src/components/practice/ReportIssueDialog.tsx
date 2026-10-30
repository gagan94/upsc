"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

const TYPES = [
  { value: "wrong_key", label: "Wrong answer key" },
  { value: "typo", label: "Typo" },
  { value: "ambiguous", label: "Ambiguous question" },
  { value: "other", label: "Other" },
];

export function ReportIssueDialog({ questionId, open, onClose }: { questionId: string; open: boolean; onClose: () => void }) {
  const [type, setType] = useState("wrong_key");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    setState("sending");
    const details = text.trim();
    try {
      await apiFetch(`/practice/questions/${encodeURIComponent(questionId)}/report`, {
        method: "POST",
        body: JSON.stringify(details ? { type, text: details } : { type }),
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  function close() {
    setType("wrong_key");
    setText("");
    setState("idle");
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Report an issue">
      {state === "sent" ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-sm text-text">Thanks, your report was sent. We will look at it.</p>
          <Button className="self-end" onClick={close}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Chips label="Type of issue" options={TYPES} value={type} onChange={setType} />
          <Field multiline label="Details (optional)" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          {state === "error" ? <p role="alert" className="text-sm font-semibold text-danger">We couldn&apos;t send your report. Please try again.</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button loading={state === "sending"} onClick={send}>Send report</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
