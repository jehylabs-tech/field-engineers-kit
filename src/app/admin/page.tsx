import GoogleSignInButton from "@/components/admin/GoogleSignInButton";

type AdminLoginPageProps = {
  searchParams: { error?: string };
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Authentication failed. Please try again.",
  unauthenticated: "You must sign in to access the admin dashboard.",
};

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? "An unexpected error occurred."
    : null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-lg border border-zone-border bg-zone-surface p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-zone-accent">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zone-ink">
          Field Engineer Kit
        </h1>
        <p className="mt-2 text-sm text-zone-muted">
          Sign in with your authorized Google account to manage calculators.
        </p>

        {errorMessage ? (
          <p
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
