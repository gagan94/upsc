import { Banner } from "@/components/ui/Banner";
import type { SaveState } from "./useSaveState";

export function SaveFeedback({ state, savedText }: { state: SaveState; savedText: string }) {
  if (state.kind === "saved") return <Banner tone="success">{savedText}</Banner>;
  if (state.kind === "error") return <Banner tone="error">Could not save your changes. {state.message}</Banner>;
  return null;
}
