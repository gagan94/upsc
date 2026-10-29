import { sampleRevision } from "@/lib/sample-data";
import { HomeCard } from "./HomeCard";

export function RevisionCard() {
  return (
    <HomeCard id="revision-heading" title="Revision and feedback">
      <p className="text-sm">{sampleRevision.flashcards}</p>
      <p className="mt-2 text-sm text-muted">{sampleRevision.feedback}</p>
    </HomeCard>
  );
}
