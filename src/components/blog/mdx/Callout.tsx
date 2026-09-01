import type { ReactNode } from "react";

type CalloutVariant = "info" | "warning" | "tip";

const variantStyles: Record<
  CalloutVariant,
  { container: string; title: string }
> = {
  info: {
    container:
      "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30",
    title: "text-blue-900 dark:text-blue-200",
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30",
    title: "text-amber-900 dark:text-amber-200",
  },
  tip: {
    container:
      "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30",
    title: "text-emerald-900 dark:text-emerald-200",
  },
};

type CalloutProps = {
  title?: string;
  variant?: CalloutVariant;
  children?: ReactNode;
};

export default function Callout({
  title,
  variant = "info",
  children,
}: CalloutProps) {
  const styles = variantStyles[variant];

  return (
    <aside
      className={`my-6 rounded-xl border p-4 md:p-5 ${styles.container}`}
      role="note"
    >
      {title ? (
        <p className={`mb-2 text-sm font-bold ${styles.title}`}>{title}</p>
      ) : null}
      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 [&>p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
