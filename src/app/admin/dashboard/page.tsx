import CalculatorList from "@/components/admin/CalculatorList";
import DashboardHeader from "@/components/admin/DashboardHeader";
import { getCalculators } from "@/lib/calculators/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { calculators, error } = await getCalculators();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader email={user?.email} />

      {error ? (
        <div
          className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          Could not load calculators: {error}. Run the SQL migration if the
          table does not exist yet.
        </div>
      ) : null}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zone-muted">
            {calculators.length} calculator{calculators.length === 1 ? "" : "s"}
          </p>
        </div>
        <CalculatorList calculators={calculators} />
      </section>
    </div>
  );
}
