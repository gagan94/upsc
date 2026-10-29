import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api";

export type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Runs a save and tracks idle/saving/saved/error. Never rejects. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const run = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    setState({ kind: "saving" });
    try {
      await fn();
      setState({ kind: "saved" });
      return true;
    } catch (e) {
      setState({ kind: "error", message: e instanceof ApiError ? e.message : "Network request failed" });
      return false;
    }
  }, []);
  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, run, reset };
}
