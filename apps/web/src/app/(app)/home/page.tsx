import { redirect } from "next/navigation";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ContinueLearningCard } from "@/components/home/ContinueLearningCard";
import { CountdownCard } from "@/components/home/CountdownCard";
import { CurrentAffairsCard } from "@/components/home/CurrentAffairsCard";
import { MentorshipCard } from "@/components/home/MentorshipCard";
import { OnboardingBanner } from "@/components/home/OnboardingBanner";
import { PracticeCard } from "@/components/home/PracticeCard";
import { RevisionCard } from "@/components/home/RevisionCard";
import { TodaysPlanCard } from "@/components/home/TodaysPlanCard";
import { WeekCard } from "@/components/home/WeekCard";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { HomeView, ProfileView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data: { home: HomeView; tz: string } | null = null;
  let unauthenticated = false;
  try {
    const [home, profile] = await Promise.all([serverApi<HomeView>("/home"), serverApi<ProfileView>("/me/profile")]);
    data = { home, tz: profile.timezone };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) unauthenticated = true;
    else if (!(e instanceof ApiError)) throw e;
  }
  if (unauthenticated) redirect("/login");
  if (data === null) return <ErrorPanel title="We couldn't load your home" />;

  const { home, tz } = data;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Your preparation at a glance</h1>
        {home.onboarding.status === "completed" ? (
          <span className="mt-2 inline-block rounded-control bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-text">
            Preparation plan
          </span>
        ) : null}
        <CountdownCard countdown={home.countdown} />
      </div>
      <OnboardingBanner status={home.onboarding.status} />
      <div className="grid grid-cols-1 gap-gap md:grid-cols-2">
        <TodaysPlanCard plan={home.plan} />
        <PracticeCard practice={home.practice} tz={tz} />
        <WeekCard week={home.week} />
      </div>
      <p role="note" className="rounded-control border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-muted">
        Sample data: the cards below show example content until these features launch.
      </p>
      <div className="grid grid-cols-1 gap-gap md:grid-cols-2">
        <ContinueLearningCard />
        <CurrentAffairsCard />
        <RevisionCard />
        <MentorshipCard />
      </div>
    </div>
  );
}
