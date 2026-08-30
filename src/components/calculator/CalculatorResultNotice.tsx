import Link from "@/components/ui/AppLink";
import { CALCULATOR_RESULT_NOTICE } from "@/lib/legal/constants";

type CalculatorResultNoticeProps = {
  className?: string;
};

export default function CalculatorResultNotice({
  className = "",
}: CalculatorResultNoticeProps) {
  return (
    <div
      className={`border-t border-dashed border-spec-border pt-3 text-sm leading-relaxed text-spec-text3 md:text-base ${className}`}
    >
      <p>
        {CALCULATOR_RESULT_NOTICE}{" "}
        <Link
          href="/disclaimer"
          className="font-medium text-spec-accentText hover:underline"
        >
          View full disclaimer
        </Link>
      </p>
      <nav
        aria-label="Legal documents"
        className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm md:text-base"
      >
        <Link href="/disclaimer" className="hover:text-spec-text hover:underline">
          Disclaimer
        </Link>
        <Link href="/privacy" className="hover:text-spec-text hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-spec-text hover:underline">
          Terms
        </Link>
      </nav>
    </div>
  );
}
