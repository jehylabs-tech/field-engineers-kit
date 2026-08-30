"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCalculator } from "@/app/admin/dashboard/actions";

type DeleteCalculatorButtonProps = {
  id: string;
  title: string;
};

export default function DeleteCalculatorButton({
  id,
  title,
}: DeleteCalculatorButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCalculator(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {error ? (
        <span className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
