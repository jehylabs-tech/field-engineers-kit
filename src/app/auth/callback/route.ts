import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isAdminEmail(user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/admin/forbidden`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin?error=auth`);
}
