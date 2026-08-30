import Link from "next/link";
import SignOutButton from "@/components/admin/SignOutButton";

type DashboardHeaderProps = {
  email?: string | null;
  showAddButton?: boolean;
  title?: string;
  subtitle?: string;
};

export default function DashboardHeader({
  email,
  showAddButton = true,
  title = "Calculator Management",
  subtitle,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-zone-border pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-zone-accent">
          Admin Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zone-ink">{title}</h1>
        <p className="mt-2 text-sm text-zone-muted">
          {subtitle ?? `Signed in as ${email ?? "admin"}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showAddButton ? (
          <Link
            href="/admin/dashboard/new"
            className="rounded-md bg-zone-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zone-accent/90"
          >
            + New Calculator
          </Link>
        ) : null}
        <SignOutButton />
      </div>
    </div>
  );
}
