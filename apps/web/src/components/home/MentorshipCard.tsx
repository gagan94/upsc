import { sampleMentorship } from "@/lib/sample-data";
import { HomeCard } from "./HomeCard";

export function MentorshipCard() {
  return (
    <HomeCard id="mentorship-heading" title="Upcoming mentorship" dark>
      <p className="font-semibold">{sampleMentorship.when}</p>
      <p className="mt-1 text-sm">{sampleMentorship.topic}</p>
    </HomeCard>
  );
}
