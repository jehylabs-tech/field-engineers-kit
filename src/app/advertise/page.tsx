import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";
import { CONTACT_EMAIL } from "@/lib/legal/constants";

export const metadata: Metadata = buildSiteMetadata({
  canonicalPath: "/advertise",
  title: "Advertise & Media Kit",
  description:
    "Reach plant engineers with B2B sponsorship on Field Engineer Kit — category exclusives, media kit, and inquiry.",
});

const SPONSOR_TIERS = [
  {
    title: "Homepage Hero Slot",
    body: "Primary B2B placement beside the workstation search — first impression for returning plant engineers.",
  },
  {
    title: "Category Exclusive",
    body: "Own Piping, Mechanical, Valves, Gaskets, Procurement, or Inspection cards for a calendar month.",
  },
  {
    title: "Calculator Result Placement",
    body: "Contextual presence next to ASME/API result panes when engineers export work packs.",
  },
];

export default function AdvertisePage() {
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("B2B Sponsorship / Media Kit")}`;

  return (
    <div className="bg-slate-50 dark:bg-spec-bg">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          B2B Media Kit
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
          Reach field engineers where they calculate
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
          Field Engineer Kit is a progressive web workstation for ASME / API
          piping, flanges, valves, gaskets, torque, and procurement checks.
          Sponsors appear in a clean industrial UI — not banner clutter.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Monthly engineer sessions", value: "Growing PWA traffic" },
            { label: "Primary audience", value: "Plant / piping / MRO" },
            { label: "Placement style", value: "Native B2B cards" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-spec-border dark:bg-spec-bg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-bold text-slate-900 dark:text-slate-50">
          Category sponsorship options
        </h2>
        <div className="mt-4 space-y-3">
          {SPONSOR_TIERS.map((tier) => (
            <article
              key={tier.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-spec-border dark:bg-spec-bg"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {tier.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {tier.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50/60 p-6 dark:border-blue-900/50 dark:bg-blue-950/30">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Request the media kit
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Tell us your category preference, flight dates, and creative assets.
            We reply with inventory, rates, and brand guidelines.
          </p>
          <a
            href={mailHref}
            className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Email {CONTACT_EMAIL}
          </a>
          <p className="mt-3 text-xs text-slate-500">
            Or browse{" "}
            <Link href="/standards" className="font-medium text-blue-600 hover:underline">
              verified engineering standards
            </Link>{" "}
            our audience works against daily.
          </p>
        </div>
      </div>
    </div>
  );
}
