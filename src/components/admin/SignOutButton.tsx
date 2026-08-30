"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-md border border-zone-border px-3 py-2 text-sm font-medium text-zone-muted transition-colors hover:bg-zone-bg hover:text-zone-ink disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
