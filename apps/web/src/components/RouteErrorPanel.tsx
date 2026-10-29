"use client";

/** Body of the route-segment error boundaries (error.tsx). Digest-only production errors have no status. */
export function RouteErrorPanel({ error, reset }: { error: Error & { digest?: string; status?: unknown }; reset: () => void }) {
  const authChanged = error.status === 401 || error.status === 403;
  return (
    <div role="alert" className="mx-auto max-w-md rounded-card border border-border bg-surface p-8 text-center">
      <h1 className="text-xl font-bold text-text">
        {authChanged ? "Your session or permissions changed" : "Something went wrong loading this page."}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {authChanged ? "Log out and sign in again to continue." : "Please try again. If it keeps happening, log out and sign in again."}
      </p>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-control bg-primary px-4 py-2 font-semibold text-primary-text"
        >
          Try again
        </button>
        {/* Plain <a>: a GET route handler with side effects must never be prefetched by <Link>. */}
        <a href="/auth/signout" className="font-semibold text-primary underline">
          Log out
        </a>
      </div>
    </div>
  );
}
