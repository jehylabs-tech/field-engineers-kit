"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { getAllCategories } from "@/lib/menu/config";
import {
  DEFAULT_FORMULA_JSON,
  slugify,
} from "@/lib/calculators/validation";
import type { ActionResult } from "@/lib/calculators/types";

type CalculatorFormProps = {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  initialValues?: {
    category: string;
    title: string;
    slug: string;
    meta_description: string;
    formula_json: string;
    is_published: boolean;
  };
  submitLabel: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zone-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zone-accent/90 disabled:opacity-60"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export default function CalculatorForm({
  action,
  initialValues,
  submitLabel,
}: CalculatorFormProps) {
  const [state, formAction] = useFormState(action, {});
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug));

  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-zone-ink">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={initialValues?.category ?? "piping"}
            className="w-full rounded-md border border-zone-border bg-zone-surface px-3 py-2 text-sm text-zone-ink focus:border-zone-accent focus:outline-none focus:ring-1 focus:ring-zone-accent"
          >
            {getAllCategories().map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
                {!category.enabled ? " (Coming soon)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="is_published" className="block text-sm font-medium text-zone-ink">
            Published
          </label>
          <label className="flex h-[42px] items-center gap-3 rounded-md border border-zone-border bg-zone-surface px-3">
            <input
              id="is_published"
              name="is_published"
              type="checkbox"
              defaultChecked={initialValues?.is_published ?? false}
              className="h-4 w-4 rounded border-zone-border text-zone-accent focus:ring-zone-accent"
            />
            <span className="text-sm text-zone-muted">
              Visible on the public site when published
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-zone-ink">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="ASME B31.3 Pipe Thickness Calculator"
          className="w-full rounded-md border border-zone-border bg-zone-surface px-3 py-2 text-sm text-zone-ink placeholder:text-zone-muted/70 focus:border-zone-accent focus:outline-none focus:ring-1 focus:ring-zone-accent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="slug" className="block text-sm font-medium text-zone-ink">
          URL Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          placeholder="pipe-wall-thickness"
          className="w-full rounded-md border border-zone-border bg-zone-surface px-3 py-2 font-mono text-sm text-zone-ink placeholder:text-zone-muted/70 focus:border-zone-accent focus:outline-none focus:ring-1 focus:ring-zone-accent"
        />
        <p className="text-xs text-zone-muted">
          Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="meta_description"
          className="block text-sm font-medium text-zone-ink"
        >
          SEO Meta Description
        </label>
        <textarea
          id="meta_description"
          name="meta_description"
          rows={3}
          defaultValue={initialValues?.meta_description ?? ""}
          placeholder="Calculate minimum pipe wall thickness per ASME B31.3 for process piping maintenance."
          className="w-full rounded-md border border-zone-border bg-zone-surface px-3 py-2 text-sm text-zone-ink placeholder:text-zone-muted/70 focus:border-zone-accent focus:outline-none focus:ring-1 focus:ring-zone-accent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="formula_json" className="block text-sm font-medium text-zone-ink">
          Formula JSON
        </label>
        <textarea
          id="formula_json"
          name="formula_json"
          rows={14}
          required
          defaultValue={initialValues?.formula_json ?? DEFAULT_FORMULA_JSON}
          spellCheck={false}
          className="w-full rounded-md border border-zone-border bg-zone-bg px-3 py-2 font-mono text-sm text-zone-ink focus:border-zone-accent focus:outline-none focus:ring-1 focus:ring-zone-accent"
        />
        <p className="text-xs text-zone-muted">
          Define inputs, formula logic, and output configuration as JSON.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-zone-border pt-6">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
