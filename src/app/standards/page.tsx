import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/standards",
  title: "Verified Engineering Standards & Codes",
  description:
    "ASME B31.3, B16.5, B16.9, B16.10, B16.20, B36.10M, API 570, PCC-1 and related codes used by Field Engineer Kit calculators.",
});

const STANDARDS = [
  {
    code: "ASME B31.3",
    title: "Process Piping",
    use: "Minimum wall thickness screening (¶304.1.2), hydro/pneumatic factors, St/S checks.",
  },
  {
    code: "ASME B16.5",
    title: "Pipe Flanges & Flanged Fittings",
    use: "Flange OD, thickness, bolt circle, hub, and Class 150–600 dimensional lookups.",
  },
  {
    code: "ASME B16.47",
    title: "Large Diameter Steel Flanges",
    use: "Applied where NPS exceeds B16.5 coverage for large-bore takeoffs.",
  },
  {
    code: "ASME B16.9",
    title: "Factory-Made Wrought Buttwelding Fittings",
    use: "Butt-weld fitting envelopes and related dimension checks.",
  },
  {
    code: "ASME B16.10",
    title: "Face-to-Face & End-to-End Dimensions of Valves",
    use: "Valve face-to-face lengths for gate, globe, check, and related types.",
  },
  {
    code: "ASME B16.20",
    title: "Metallic Gaskets for Pipe Flanges",
    use: "Spiral-wound and RTJ ring gasket dimensions.",
  },
  {
    code: "ASME B36.10M",
    title: "Welded & Seamless Wrought Steel Pipe",
    use: "OD, ID, wall, schedule tables, and unit mass for procurement MTOs.",
  },
  {
    code: "API 570",
    title: "Piping Inspection Code",
    use: "Hydrostatic and pneumatic test pressure practice with B31.3 factors.",
  },
  {
    code: "ASME PCC-1",
    title: "Guidelines for Pressure Boundary Bolted Flange Joint Assembly",
    use: "Bolt assembly torque / tensioning screening references.",
  },
  {
    code: "ISA 75.01 / IEC 60534",
    title: "Control Valve Sizing",
    use: "Control-valve Cv sizing for liquid and gas service.",
  },
];

export default function StandardsPage() {
  return (
    <div className="bg-slate-50 dark:bg-spec-bg">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Standards Index
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
          Verified Engineering Standards & Codes
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
          Field Engineer Kit maps day-to-day plant checks to published codes.
          Outputs are for screening and reference — stamped designs require the
          governing edition and qualified engineering judgment. See the{" "}
          <Link href="/disclaimer" className="font-medium text-blue-600 hover:underline">
            full engineering disclaimer
          </Link>
          .
        </p>

        <ul className="mt-10 space-y-3">
          {STANDARDS.map((item) => (
            <li
              key={item.code}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-spec-border dark:bg-spec-bg"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded-md border border-slate-200/80 bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:border-spec-border dark:bg-spec-panel dark:text-slate-200">
                  {item.code}
                </span>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {item.title}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.use}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-slate-500">
          Also see the homepage{" "}
          <Link href="/#engineering-standards" className="text-blue-600 hover:underline">
            standards SEO footnote
          </Link>{" "}
          and live tools on the{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            workstation
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
