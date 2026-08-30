export default function CalculatorLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-6 py-6">
      <div className="mb-4 h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-6 h-8 w-72 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 h-80 rounded-lg border border-slate-200 bg-white dark:border-spec-border dark:bg-spec-panel lg:col-span-5" />
        <div className="col-span-12 h-80 rounded-lg border border-slate-200 bg-white dark:border-spec-border dark:bg-spec-panel lg:col-span-7" />
      </div>
    </div>
  );
}
