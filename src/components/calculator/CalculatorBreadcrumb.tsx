import Link from "@/components/ui/AppLink";
import { CATEGORY_UI } from "@/lib/home/ui";
import { getCategoryById } from "@/lib/menu/config";

type CalculatorBreadcrumbProps = {
  category: string;
  title: string;
};

export default function CalculatorBreadcrumb({
  category,
  title,
}: CalculatorBreadcrumbProps) {
  const categoryMeta = getCategoryById(category);
  const categoryUi = CATEGORY_UI[category];
  const categoryLabel =
    categoryUi?.shortLabel ?? categoryMeta?.label ?? category;

  return (
    <nav
      aria-label="Breadcrumb"
      className="-mx-6 flex items-center gap-1.5 border-b border-spec-border bg-spec-bg px-6 py-2 text-sm text-spec-text3"
    >
      <Link href="/" className="hover:text-spec-text2">
        Home
      </Link>
      <span aria-hidden="true">/</span>
      <Link href={`/category/${category}`} className="hover:text-spec-text2">
        {categoryLabel}
      </Link>
      <span aria-hidden="true">/</span>
      <span className="truncate font-medium text-spec-text2">{title}</span>
    </nav>
  );
}
