import { Banner } from "@/components/ui/Banner";

export function OverloadBanner({ overloaded }: { overloaded: boolean }) {
  if (!overloaded) return null;
  return (
    <Banner tone="warning">This day looks overloaded. Consider moving some tasks to another day or skipping the least important.</Banner>
  );
}
