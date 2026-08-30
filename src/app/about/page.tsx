import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";
import { CONTACT_EMAIL } from "@/lib/legal/constants";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/about",
  title: "About Us & Editorial Standards | FieldEngineersKit",
  description:
    "Learn about FieldEngineersKit's mission to deliver deterministic, code-verified ASME, API, and ISO industrial piping calculators for plant engineers and procurement teams.",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          About FieldEngineersKit
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300 md:text-lg">
          Deterministic, code-verified calculation workstations built specifically for plant maintenance, piping engineering, and industrial procurement.
        </p>
      </div>

      <div className="prose prose-slate max-w-none space-y-8 dark:prose-invert">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300 md:text-base">
            In industrial plant engineering and maintenance, decisions involve high pressures, hazardous media, and substantial procurement costs. Guesswork and unverified spreadsheets lead to downtime, safety risks, or costly material mismatches.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300 md:text-base">
            <strong>FieldEngineersKit (FEK)</strong> was built to eliminate friction in the engineering workflow by providing zero-overhead, deterministic, and code-aligned calculation tools. Every tool is designed for instant verification in both metric and imperial units with seamless carry-over across piping specs.
          </p>
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <h2 className="text-lg font-bold text-blue-950 dark:text-blue-100">Editorial & Calculation Verification Standards</h2>
          <div className="mt-3 space-y-3 text-sm text-blue-900 dark:text-blue-200">
            <div>
              <strong className="block text-slate-900 dark:text-white">1. Verified Code Standards (ASME / API / ISO / ISA)</strong>
              All calculation logic strictly reflects published international engineering standards—including ASME B31.3 (Process Piping), ASME B16.5 (Flanges), ASME B16.9 (Fittings), ASME B16.20 (Gaskets), ASME PCC-1 (Flange Bolting), ISA S75.01 / IEC 60534 (Control Valves), and API RP 14E (Erosion).
            </div>
            <div>
              <strong className="block text-slate-900 dark:text-white">2. Deterministic Client-Side Architecture</strong>
              Calculations are executed client-side with 100% test coverage using automated regression test suites. Results are predictable, repeatable, and audited against published reference standard lookup tables.
            </div>
            <div>
              <strong className="block text-slate-900 dark:text-white">3. Clear Engineering Disclaimers</strong>
              FieldEngineersKit provides preliminary screening and field estimation tools. We maintain strict transparent disclaimers: screening outputs do not replace formal computer-aided finite element / pipe stress analysis (e.g., CAESAR II) or professional engineer certification.
            </div>
            <div>
              <strong className="block text-slate-900 dark:text-white">4. Privacy-First Field Operation</strong>
              We do not track, store, or transmit confidential plant design inputs, pipe dimensions, or proprietary process pressures. Tools run fully offline as Progressive Web Apps (PWA) in hazardous or off-grid field locations.
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Explore Verified Standards & Calculators</h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 md:text-base">
            Review our comprehensive list of referenced codes on the{" "}
            <Link href="/standards" className="font-semibold text-blue-600 underline dark:text-blue-400">
              Standards & Codes Index
            </Link>{" "}
            or explore all available tools in the{" "}
            <Link href="/calculators" className="font-semibold text-blue-600 underline dark:text-blue-400">
              Calculator Catalog
            </Link>.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Contact & Feedback</h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 md:text-base">
            Have questions, feedback, or a request for a specific engineering standard calculator? Reach our engineering team directly at:
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center font-mono text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
