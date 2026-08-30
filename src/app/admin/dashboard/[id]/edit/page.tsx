import Link from "next/link";
import { notFound } from "next/navigation";
import CalculatorForm from "@/components/admin/CalculatorForm";
import DashboardHeader from "@/components/admin/DashboardHeader";
import { updateCalculator } from "@/app/admin/dashboard/actions";
import { formatFormulaJson } from "@/lib/calculators/validation";
import { getCalculatorById } from "@/lib/calculators/queries";
import { createClient } from "@/lib/supabase/server";

type EditCalculatorPageProps = {
  params: { id: string };
};

export default async function EditCalculatorPage({
  params,
}: EditCalculatorPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { calculator, error } = await getCalculatorById(params.id);

  if (error || !calculator) {
    notFound();
  }

  const boundUpdate = updateCalculator.bind(null, params.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader
        email={user?.email}
        showAddButton={false}
        title="Edit Calculator"
        subtitle={calculator.title}
      />

      <div className="mt-8 rounded-lg border border-zone-border bg-zone-surface p-6">
        <CalculatorForm
          action={boundUpdate}
          submitLabel="Save Changes"
          initialValues={{
            category: calculator.category,
            title: calculator.title,
            slug: calculator.slug,
            meta_description: calculator.meta_description ?? "",
            formula_json: formatFormulaJson(calculator.formula_json),
            is_published: calculator.is_published,
          }}
        />
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
