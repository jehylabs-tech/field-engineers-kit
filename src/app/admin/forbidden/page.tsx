import Link from "next/link";
import SignOutButton from "@/components/admin/SignOutButton";

export default function AdminForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-lg border border-zone-border bg-zone-surface p-8 text-center shadow-sm">
        <p className="text-5xl font-semibold text-zone-accent">403</p>
        <h1 className="mt-4 text-xl font-semibold text-zone-ink">
          Access denied
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zone-muted">
          Your Google account is not authorized to access the admin dashboard.
          Only the designated administrator email can manage calculators.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-md border border-zone-border px-4 py-2 text-sm font-medium text-zone-ink hover:bg-zone-bg"
          >
            Back to site
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
