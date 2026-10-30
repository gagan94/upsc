/** Loading placeholder; size it with className (e.g. "h-4 w-32"). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-border ${className}`} />;
}
