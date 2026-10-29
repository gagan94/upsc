import { StubPage } from "@/components/StubPage";
import { getNavItem } from "@/lib/nav";

export default function Page() {
  return <StubPage item={getNavItem("current-affairs")} />;
}
