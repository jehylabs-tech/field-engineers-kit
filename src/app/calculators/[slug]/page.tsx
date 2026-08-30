import { redirect } from "next/navigation";

type PageProps = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default function CalculatorsSlugRedirect({
  params,
  searchParams,
}: PageProps) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  redirect(
    suffix
      ? `/calculator/${params.slug}?${suffix}`
      : `/calculator/${params.slug}`,
  );
}
