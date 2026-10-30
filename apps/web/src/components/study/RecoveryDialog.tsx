"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDuration } from "@/lib/format";
import type { RecoverAction, StudySessionView } from "@/lib/types";

/** A running/paused session with no heartbeat for over 10 minutes must be recovered explicitly. */
export function RecoveryDialog({
  open,
  session,
  onClose,
  onRecover,
}: {
  open: boolean;
  session: StudySessionView | null;
  onClose: () => void;
  onRecover: (action: RecoverAction) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<RecoverAction | null>(null);
  const go = async (a: RecoverAction) => {
    setBusy(a);
    await onRecover(a);
    setBusy(null);
  };
  return (
    <Modal open={open} onClose={onClose} title="Recover your session?">
      <p className="text-sm text-text">
        We lost contact with your study session, so its clock stopped at the last activity
        {session ? ` (${formatDuration(session.activeSeconds)} studied of ${session.plannedMin} min)` : ""}. What would you like to do?
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="danger" loading={busy === "discard"} disabled={busy !== null} onClick={() => void go("discard")}>
          Discard
        </Button>
        <Button variant="secondary" loading={busy === "end"} disabled={busy !== null} onClick={() => void go("end")}>
          End at last activity
        </Button>
        <Button loading={busy === "resume"} disabled={busy !== null} onClick={() => void go("resume")}>
          Resume
        </Button>
      </div>
    </Modal>
  );
}

/** Shown after 3 minutes without interaction paused the session. */
export function StillStudyingDialog({
  open,
  onClose,
  onResume,
  onEnd,
}: {
  open: boolean;
  onClose: () => void;
  onResume: () => Promise<boolean>;
  onEnd: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Still studying?">
      <p className="text-sm text-text">We paused your session because we haven&apos;t seen any activity for 3 minutes.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onEnd}>
          End
        </Button>
        <Button onClick={() => void onResume()}>Resume</Button>
      </div>
    </Modal>
  );
}
