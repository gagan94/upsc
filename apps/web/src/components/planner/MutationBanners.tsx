"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";

/** Failure and undo-delete banners driven by usePlannerMutations. */
export function MutationBanners({
  failed,
  onDismiss,
  undo,
  onUndo,
}: {
  failed: boolean;
  onDismiss: () => void;
  undo: boolean;
  onUndo: () => void;
}) {
  return (
    <>
      {failed ? (
        <Banner tone="error">
          <div className="flex items-center justify-between gap-3">
            <span>
              <strong>Task save failed</strong>. Your change was undone. Please try again.
            </span>
            <Button size="sm" variant="secondary" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </Banner>
      ) : null}
      {undo ? (
        <Banner tone="info">
          <div className="flex items-center justify-between gap-3">
            <span>Task deleted.</span>
            <Button size="sm" variant="secondary" onClick={onUndo}>
              Undo
            </Button>
          </div>
        </Banner>
      ) : null}
    </>
  );
}
