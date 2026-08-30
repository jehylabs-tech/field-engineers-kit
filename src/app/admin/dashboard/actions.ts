"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { parseCalculatorForm } from "@/lib/calculators/validation";
import type { ActionResult } from "@/lib/calculators/types";
import { createClient } from "@/lib/supabase/server";

async function requireAdminClient() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/admin/forbidden");
  }

  return supabase;
}

function formDataToInput(formData: FormData) {
  return {
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    meta_description: String(formData.get("meta_description") ?? ""),
    formula_json: String(formData.get("formula_json") ?? "{}"),
    is_published: formData.get("is_published") === "on",
  };
}

export async function createCalculator(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await requireAdminClient();
  const parsed = parseCalculatorForm(formDataToInput(formData));

  if (parsed.error) {
    return { error: parsed.error };
  }

  const { error } = await supabase.from("calculators").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return { error: "A calculator with this slug already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  redirect("/admin/dashboard");
}

export async function updateCalculator(
  id: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await requireAdminClient();
  const parsed = parseCalculatorForm(formDataToInput(formData));

  if (parsed.error) {
    return { error: parsed.error };
  }

  const { error } = await supabase
    .from("calculators")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A calculator with this slug already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/dashboard/${id}/edit`);
  redirect("/admin/dashboard");
}

export async function deleteCalculator(id: string): Promise<ActionResult> {
  const supabase = await requireAdminClient();

  const { error } = await supabase.from("calculators").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function toggleCalculatorPublish(
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const supabase = await requireAdminClient();

  const { error } = await supabase
    .from("calculators")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}
