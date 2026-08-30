import type { ReactNode } from "react";

type SchematicFrameProps = {
  title: string;
  children: ReactNode;
  caption?: string | null;
  /** Larger canvas for face-to-face / takeout diagrams. */
  size?: "default" | "large";
};

export default function SchematicFrame({
  title,
  children,
  caption = null,
  size = "default",
}: SchematicFrameProps) {
  const canvasMax =
    size === "large"
      ? "mx-auto flex max-h-[280px] w-full min-w-0 max-w-full items-center justify-center md:max-h-[340px]"
      : "mx-auto flex max-h-[200px] w-full min-w-0 max-w-full items-center justify-center md:max-h-[220px]";

  return (
    <div className="schematic-frame mt-2 border-t border-spec-border pt-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-spec-text3">
        {title}
      </p>
      <div className="overflow-hidden rounded-md border border-dashed border-spec-border bg-spec-bg">
        <div className={canvasMax}>{children}</div>
      </div>
      {caption ? (
        <p className="mt-1.5 text-[10px] leading-snug text-amber-800/90 dark:text-amber-200/80">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
