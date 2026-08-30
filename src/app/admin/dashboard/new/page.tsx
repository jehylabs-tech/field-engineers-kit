import Link from "next/link";
import CalculatorForm from "@/components/admin/CalculatorForm";
import DashboardHeader from "@/components/admin/DashboardHeader";
import { createCalculator } from "@/app/admin/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewCalculatorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader
        email={user?.email}
        showAddButton={false}
        title="New Calculator"
        subtitle="Create a calculator entry for the public site."
      />

      <div className="mt-8 rounded-lg border border-zone-border bg-zone-surface p-6">
        <CalculatorForm action={createCalculator} submitLabel="Create Calculator" />
      </div>

      <div className="mt-6">
        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-zone-accent hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
