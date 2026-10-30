import { RetryButton } from "./RetryButton";

/** Full-page error panel for layouts: retry the current page, or log out (/auth/signout). */
export function ErrorPanel({ title, embedded = false }: { title: string; embedded?: boolean }) {
  const Wrapper = embedded ? "div" : "main";
  return (
    <Wrapper className={embedded ? "flex justify-center p-4" : "flex min-h-screen items-center justify-center bg-bg p-4"}>
      <div role="alert" className="max-w-md rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-bold text-text">{title}</h1>
        <p className="mt-2 text-sm text-muted">Something went wrong reaching the server. Please try again.</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <RetryButton className="rounded-control bg-primary px-4 py-2 font-semibold text-primary-text" />
          {/* Plain <a>: a GET route handler with side effects must never be prefetched by <Link>. */}
          <a href="/auth/signout" className="font-semibold text-primary underline">
            Log out
          </a>
        </div>
      </div>
    </Wrapper>
  );
}
