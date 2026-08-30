type AdSlotProps = {
  slot: "hero" | "catalog" | "calculator";
};

/** Reserved AdSense unit so CLS stays low after approval. Empty until ads go live. */
export default function AdSlot({ slot }: AdSlotProps) {
  if (slot === "calculator") {
    return (
      <div
        className="ad-slot-calculator-middle px-3.5 md:px-6"
        aria-hidden="true"
        data-ad-slot="calculator"
        style={{
          minHeight: 90,
          margin: "24px 0",
          background: "transparent",
          border: "1px dashed rgba(0,0,0,0.05)",
        }}
      />
    );
  }

  return (
    <aside
      data-ad-slot={slot}
      aria-hidden="true"
      className={
        slot === "hero"
          ? "border-b border-spec-border px-4 py-3 md:px-6"
          : "mb-6"
      }
    >
      <div
        className="mx-auto w-full max-w-[728px] min-h-[100px] md:min-h-[90px]"
        style={{
          minHeight: 90,
          background: "transparent",
          border: "1px dashed rgba(0,0,0,0.05)",
        }}
      />
    </aside>
  );
}
