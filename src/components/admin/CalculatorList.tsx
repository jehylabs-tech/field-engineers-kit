import Link from "next/link";
import DeleteCalculatorButton from "@/components/admin/DeleteCalculatorButton";
import PublishToggle from "@/components/admin/PublishToggle";
import { getAllCategories } from "@/lib/menu/config";
import type { Calculator } from "@/lib/calculators/types";

type CalculatorListProps = {
  calculators: Calculator[];
};

function getCategoryLabel(categoryId: string): string {
  return getAllCategories().find((c) => c.id === categoryId)?.label ?? categoryId;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isPublished
          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
          : "bg-zone-bg text-zone-muted ring-1 ring-inset ring-zone-border"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

export default function CalculatorList({ calculators }: CalculatorListProps) {
  if (calculators.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zone-border bg-zone-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-zone-ink">No calculators yet</p>
        <p className="mt-2 text-sm text-zone-muted">
          Create your first calculator to start publishing tools for field teams.
        </p>
        <Link
          href="/admin/dashboard/new"
          className="mt-4 inline-block rounded-md bg-zone-accent px-4 py-2 text-sm font-medium text-white hover:bg-zone-accent/90"
        >
          + New Calculator
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-zone-border bg-zone-surface md:block">
        <table className="min-w-full divide-y divide-zone-border">
          <thead className="bg-zone-bg/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zone-muted">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zone-muted">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zone-muted">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zone-muted">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zone-muted">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zone-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zone-border">
            {calculators.map((calculator) => (
              <tr key={calculator.id} className="hover:bg-zone-bg/40">
                <td className="px-4 py-3 text-sm text-zone-muted">
                  {getCategoryLabel(calculator.category)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-zone-ink">
                  {calculator.title}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-zone-muted">
                  {calculator.slug}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge isPublished={calculator.is_published} />
                </td>
                <td className="px-4 py-3 text-sm text-zone-muted">
                  {formatDate(calculator.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <PublishToggle
                      id={calculator.id}
                      isPublished={calculator.is_published}
                    />
                    <Link
                      href={`/admin/dashboard/${calculator.id}/edit`}
                      className="rounded-md border border-zone-border px-3 py-1.5 text-sm font-medium text-zone-ink transition-colors hover:bg-zone-bg"
                    >
                      Edit
                    </Link>
                    <DeleteCalculatorButton
                      id={calculator.id}
                      title={calculator.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {calculators.map((calculator) => (
          <article
            key={calculator.id}
            className="rounded-lg border border-zone-border bg-zone-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zone-muted">
                  {getCategoryLabel(calculator.category)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-zone-ink">
                  {calculator.title}
                </h3>
              </div>
              <StatusBadge isPublished={calculator.is_published} />
            </div>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zone-muted">Slug</dt>
                <dd className="font-mono text-zone-ink">{calculator.slug}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zone-muted">Created</dt>
                <dd className="text-zone-ink">
                  {formatDate(calculator.created_at)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zone-border pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zone-muted">Published</span>
                <PublishToggle
                  id={calculator.id}
                  isPublished={calculator.is_published}
                />
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/dashboard/${calculator.id}/edit`}
                  className="rounded-md border border-zone-border px-3 py-1.5 text-sm font-medium text-zone-ink hover:bg-zone-bg"
                >
                  Edit
                </Link>
                <DeleteCalculatorButton
                  id={calculator.id}
                  title={calculator.title}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
