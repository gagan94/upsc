import { Field } from "@/components/ui/Field";

export function AccountPanel({ email }: { email: string }) {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Field label="Email" value={email} readOnly hint="Your sign-in email. It cannot be changed here." />
      {/* Plain <a>: the sign-out route is a GET handler with side effects and must not be prefetched. */}
      <div>
        <a
          href="/auth/signout?done=1"
          className="inline-flex rounded-control border border-danger-border bg-danger-bg px-4 py-2 text-sm font-semibold text-danger hover:opacity-90"
        >
          Log out
        </a>
      </div>
    </div>
  );
}
