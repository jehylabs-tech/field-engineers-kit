import { redirect } from "next/navigation";
import { getAllCategories, getCategoryById } from "@/lib/menu/config";

type Props = {
  params: { category: string };
};

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ category: category.id }));
}

export default function LegacyCategoryRedirectPage({ params }: Props) {
  const category = getCategoryById(params.category);

  if (!category) {
    redirect("/");
  }

  redirect(`/category/${params.category}`);
}
