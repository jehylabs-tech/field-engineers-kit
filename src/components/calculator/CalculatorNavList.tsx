import Link from "@/components/ui/AppLink";
import { CATEGORY_UI } from "@/lib/home/ui";
import { getAllCategories, getVisibleCategories } from "@/lib/menu/config";

type CalculatorNavListProps = {
  activeCategory: string;
  activeSlug: string;
  calculators: { slug: string; title: string; category: string }[];
  onNavigate?: () => void;
};

export default function CalculatorNavList({
  activeCategory,
  activeSlug,
  calculators,
  onNavigate,
}: CalculatorNavListProps) {
  const category = getAllCategories().find((item) => item.id === activeCategory);
  const visibleCategories = getVisibleCategories();
  const categoryCalculators = calculators.filter(
    (item) => item.category === activeCategory,
  );

  return (
    <>
      <p className="px-2 py-1.5 text-[15px] font-semibold uppercase tracking-wide text-spec-text3">
        Categories
      </p>
      {visibleCategories.map((item) => {
        const ui = CATEGORY_UI[item.id];
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center justify-between rounded-md px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-spec-accent ${
              item.id === activeCategory
                ? "bg-spec-accentBg font-medium text-spec-accentText"
                : "text-spec-text2 hover:bg-spec-bg hover:text-spec-text"
            }`}
          >
            {ui?.label ?? item.label}
            <span className="text-sm text-spec-text3">
              {calculators.filter((c) => c.category === item.id).length}
            </span>
          </Link>
        );
      })}

      {category ? (
        <div className="mb-2 mt-0.5 space-y-0.5 pl-5">
          {categoryCalculators.map((item) => (
            <Link
              key={item.slug}
              href={`/calculator/${item.slug}`}
              onClick={onNavigate}
              className={`block rounded-md px-2 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-spec-accent ${
                item.slug === activeSlug
                  ? "bg-spec-accentBg font-medium text-spec-accentText"
                  : "text-spec-text2 hover:bg-spec-bg hover:text-spec-text"
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
