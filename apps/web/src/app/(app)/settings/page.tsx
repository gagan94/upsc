import { StubPage } from "@/components/StubPage";
import { getNavItem } from "@/lib/nav";

export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  const label = section
    ? section
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : undefined;
  return <StubPage item={getNavItem("settings")} extra={label ? `Section: ${label}` : undefined} />;
}
