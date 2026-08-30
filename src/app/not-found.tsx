import Link from "@/components/ui/AppLink";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-spec-accentText">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-spec-text">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-spec-text2">
        The page you requested does not exist or may have been moved. Return to
        the home page to browse calculators and categories.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-spec-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-spec-accentText"
      >
        Return to Home
      </Link>
    </div>
  );
}
