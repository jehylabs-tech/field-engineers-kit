import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/admin?error=unauthenticated");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin?error=unauthenticated");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/admin/forbidden");
  }

  return children;
}
