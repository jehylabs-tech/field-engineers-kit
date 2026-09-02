"use client";

import dynamic from "next/dynamic";
import { Suspense, useState, type ComponentType, type ReactNode } from "react";
import BottomBanner from "@/components/calculator/BottomBanner";
import AdSlot from "@/components/ads/AdSlot";
import {
  CalculatorOutputProvider,
  useCalculatorOutput,
} from "@/components/calculator/CalculatorOutputContext";
import CalculatorNavDrawer from "@/components/calculator/CalculatorNavDrawer";
import CalculatorBreadcrumb from "@/components/calculator/CalculatorBreadcrumb";
import InFeedAd from "@/components/calculator/InFeedAd";
import { CarryOverProvider } from "@/components/calculator/CarryOverContext";
import PageTitleRow from "@/components/calculator/PageTitleRow";
import NextActionsSection from "@/components/calculator/NextActionsSection";
import SpecHeader from "@/components/calculator/SpecHeader";
import SummaryBar from "@/components/calculator/SummaryBar";
import TrackRecentVisit from "@/components/calculator/TrackRecentVisit";
import UrlShareBar from "@/components/calculator/UrlShareBar";
import { CalculatorMetaProvider } from "@/components/calculator/CalculatorMetaContext";
import { SpecSeedProvider } from "@/components/calculator/SpecSeedContext";
import type { Calculator } from "@/lib/calculators/types";
import { getCalculatorSeo } from "../../../data/calculatorSeoData";
import {
  parseCalculatorDefinition,
  type CalculatorDefinition,
  type CalculatorType,
} from "@/lib/calculators/definitions";

type CalculatorViewProps = {
  title: string;
  standard?: string;
};

const loadingFallback = () => (
  <div className="px-3.5 py-10 text-base text-spec-text2 md:px-6">
    Loading calculator…
  </div>
);

/** Lazy per calculator — keeps chunks small and avoids Turbopack compile storms. */
const CALCULATOR_VIEWS: Record<
  CalculatorType,
  ComponentType<CalculatorViewProps>
> = {
  "valve-cv": dynamic(() => import("./calculators/ValveCvCalculator"), {
    loading: loadingFallback,
  }),
  "metal-weight": dynamic(() => import("./calculators/MetalWeightCalculator"), {
    loading: loadingFallback,
  }),
  "pipe-schedule": dynamic(() => import("./calculators/PipeScheduleCalculator"), {
    loading: loadingFallback,
  }),
  "flange-dimension": dynamic(
    () => import("./calculators/FlangeDimensionCalculator"),
    { loading: loadingFallback },
  ),
  "fitting-valve-dimension": dynamic(
    () => import("./calculators/FittingValveDimensionCalculator"),
    { loading: loadingFallback },
  ),
  "butt-weld-fitting": dynamic(
    () => import("./calculators/ButtWeldFittingCalculator"),
    { loading: loadingFallback },
  ),
  "bolt-torque": dynamic(() => import("./calculators/BoltTorqueCalculator"), {
    loading: loadingFallback,
  }),
  "gasket-dimension": dynamic(
    () => import("./calculators/GasketDimensionCalculator"),
    { loading: loadingFallback },
  ),
  "hydro-test": dynamic(() => import("./calculators/HydroTestCalculator"), {
    loading: loadingFallback,
  }),
  "blind-flange": dynamic(() => import("./calculators/BlindFlangeCalculator"), {
    loading: loadingFallback,
  }),
  "pipe-thickness": dynamic(
    () => import("./calculators/PipeThicknessCalculator"),
    { loading: loadingFallback },
  ),
  "thermal-expansion": dynamic(
    () => import("./calculators/ThermalExpansionCalculator"),
    { loading: loadingFallback },
  ),
  "pressure-drop": dynamic(() => import("./calculators/PressureDropCalculator"), {
    loading: loadingFallback,
  }),
  "flow-velocity": dynamic(() => import("./calculators/FlowVelocityCalculator"), {
    loading: loadingFallback,
  }),
  "unit-converter": dynamic(
    () => import("./calculators/UnitConverterCalculator"),
    { loading: loadingFallback },
  ),
};

type CalculatorShellProps = {
  calculator: Calculator;
  allCalculators: Calculator[];
  children?: ReactNode;
  specSeed?: Record<string, string>;
  specLabel?: string;
};

function CalculatorBody({
  definition,
  calculator,
}: {
  definition: CalculatorDefinition;
  calculator: Calculator;
}) {
  const View =
    CALCULATOR_VIEWS[definition.type] ?? CALCULATOR_VIEWS["pipe-thickness"];

  return (
    <View title={calculator.title} standard={definition.standard} />
  );
}

function CalculatorViewFallback() {
  return (
    <div className="px-3.5 py-10 text-base text-spec-text2 md:px-6">
      Loading calculator inputs…
    </div>
  );
}

function CalculatorMain({
  calculator,
  allCalculators,
  definition,
  children,
  specLabel,
}: CalculatorShellProps & { definition: CalculatorDefinition }) {
  const { output } = useCalculatorOutput();
  const [navOpen, setNavOpen] = useState(false);
  const title = specLabel
    ? `${specLabel} · ${calculator.title}`
    : calculator.title;
  const navCalculators = allCalculators.map((item) => ({
    slug: item.slug,
    title: item.title,
    category: item.category,
  }));

  const seo = getCalculatorSeo(calculator.slug);
  const nextActionsSectionNumber =
    seo?.allowancesAndTolerances &&
    seo?.materialLimitations &&
    seo?.workedExample
      ? 6
      : 5;

  return (
    <div className="bg-spec-bg text-spec-text">
      <TrackRecentVisit
        slug={calculator.slug}
        title={calculator.title}
        category={calculator.category}
      />
      <SpecHeader onOpenMenu={() => setNavOpen(true)} />
      {output ? (
        <SummaryBar items={output.summary} status={output.summaryStatus} />
      ) : (
        <SummaryBar
          items={[
            { label: "Status", value: "Ready" },
            { label: "Mode", value: "Live calc" },
          ]}
          status={{
            label: "Adjust inputs to compute results",
            level: "neutral",
          }}
        />
      )}
      <CalculatorNavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        activeCategory={calculator.category}
        activeSlug={calculator.slug}
        calculators={navCalculators}
      />
      <div className="block w-full min-w-0 max-w-full px-6">
        <main className="block w-full min-w-0 max-w-full">
          <CalculatorBreadcrumb
            category={calculator.category}
            title={calculator.title}
          />
          <PageTitleRow
            title={title}
            subtitle={definition.subtitle}
            standard={definition.standard}
            actions={
              <Suspense fallback={null}>
                <UrlShareBar />
              </Suspense>
            }
          />

          <Suspense fallback={<CalculatorViewFallback />}>
            <CalculatorBody definition={definition} calculator={calculator} />
          </Suspense>
        </main>
      </div>

      <div className="w-full px-6 pb-10 pt-3">
        <AdSlot slot="calculator" />
        {children}
        <InFeedAd />
        <Suspense fallback={null}>
          <NextActionsSection
            currentType={definition.type}
            calculators={allCalculators}
            related={definition.related}
            sponsor={definition.sponsor}
            sectionNumber={nextActionsSectionNumber}
          />
        </Suspense>
        <BottomBanner />
      </div>
    </div>
  );
}

export default function CalculatorShell(props: CalculatorShellProps) {
  const definition = parseCalculatorDefinition(props.calculator.formula_json);

  return (
    <CalculatorOutputProvider>
      <CarryOverProvider>
        <SpecSeedProvider seed={props.specSeed}>
          <CalculatorMetaProvider
            value={{
              standard: definition.standard,
              formulaBasis: definition.formulaBasis,
              slug: props.calculator.slug,
              type: definition.type,
            }}
          >
            <CalculatorMain {...props} definition={definition} />
          </CalculatorMetaProvider>
        </SpecSeedProvider>
      </CarryOverProvider>
    </CalculatorOutputProvider>
  );
}
