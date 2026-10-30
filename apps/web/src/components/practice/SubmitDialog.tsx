"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function SubmitDialog({
  open,
  unanswered,
  flagged,
  submitting,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  unanswered: number;
  flagged: number;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={() => (submitting ? undefined : onClose())} title="Submit this set?">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Once you submit you can&apos;t change your answers.</p>
        <ul className="flex flex-col gap-1 text-sm font-semibold text-text">
          <li>{`${unanswered} unanswered`}</li>
          <li>{`${flagged} flagged for review`}</li>
        </ul>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Keep working</Button>
          <Button onClick={onConfirm} loading={submitting}>Submit now</Button>
        </div>
      </div>
    </Modal>
  );
}
