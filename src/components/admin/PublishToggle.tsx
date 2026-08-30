"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleCalculatorPublish } from "@/app/admin/dashboard/actions";

type PublishToggleProps = {
  id: string;
  isPublished: boolean;
};

export default function PublishToggle({ id, isPublished }: PublishToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCalculatorPublish(id, !isPublished);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublished}
      aria-label={isPublished ? "Unpublish calculator" : "Publish calculator"}
      disabled={pending}
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
        isPublished
          ? "border-zone-accent bg-zone-accent"
          : "border-zone-border bg-zone-bg"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isPublished ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
