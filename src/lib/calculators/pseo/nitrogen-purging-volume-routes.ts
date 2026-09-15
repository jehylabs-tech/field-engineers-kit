/**
 * Pattern B: /calculator/nitrogen-purging-volume/{spec}
 */

type Route = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};

export function listNitrogenPurgingVolumePseoRoutes(slug: string): Route[] {
  return [
    {
      slug,
      spec: "piping-dilution-nps12-100m",
      query: {
        units: "metric",
        geometryType: "piping",
        pipeNps: "12",
        pipeSchedule: "40",
        pipeLength: "100",
        purgeMethod: "dilution-sweep",
        initialO2: "21",
        targetO2: "5",
        purgeFlowRate: "50",
        mixingEfficiency: "0.75",
      },
      label: "Piping dilution · NPS 12 · 100 m",
    },
    {
      slug,
      spec: "vessel-pressure-cycle-2000mm-6000mm",
      query: {
        units: "metric",
        geometryType: "vessel",
        vesselDiameter: "2000",
        vesselLength: "6000",
        purgeMethod: "pressure-cycle",
        initialO2: "21",
        targetO2: "5",
        cycleHighPressure: "3",
      },
      label: "Vessel pressure-cycle · Di 2000 · L 6000 mm",
    },
    {
      slug,
      spec: "piping-dilution-nps24-500ft",
      query: {
        units: "imperial",
        geometryType: "piping",
        pipeNps: "24",
        pipeSchedule: "40",
        pipeLength: "500",
        purgeMethod: "dilution-sweep",
        initialO2: "21",
        targetO2: "1",
        purgeFlowRate: "100",
        mixingEfficiency: "0.75",
      },
      label: "Piping dilution · NPS 24 · 500 ft",
    },
    {
      slug,
      spec: "custom-pressure-cycle-1000cuft",
      query: {
        units: "imperial",
        geometryType: "custom-volume",
        customVolume: "1000",
        purgeMethod: "pressure-cycle",
        initialO2: "21",
        targetO2: "2",
        cycleHighPressure: "45",
      },
      label: "Custom pressure-cycle · 1000 ft³",
    },
    // Additional metric / imperial coverage
    {
      slug,
      spec: "piping-dilution-nps6-50m",
      query: {
        units: "metric",
        geometryType: "piping",
        pipeNps: "6",
        pipeSchedule: "40",
        pipeLength: "50",
        purgeMethod: "dilution-sweep",
        initialO2: "21",
        targetO2: "8",
        purgeFlowRate: "25",
        mixingEfficiency: "0.75",
      },
      label: "Piping dilution · NPS 6 · 50 m",
    },
    {
      slug,
      spec: "vessel-dilution-2500mm-8000mm",
      query: {
        units: "metric",
        geometryType: "vessel",
        vesselDiameter: "2500",
        vesselLength: "8000",
        purgeMethod: "dilution-sweep",
        initialO2: "21",
        targetO2: "5",
        purgeFlowRate: "100",
        mixingEfficiency: "0.7",
      },
      label: "Vessel dilution · Di 2500 · L 8000 mm",
    },
    {
      slug,
      spec: "piping-pressure-cycle-nps8-200ft",
      query: {
        units: "imperial",
        geometryType: "piping",
        pipeNps: "8",
        pipeSchedule: "40",
        pipeLength: "200",
        purgeMethod: "pressure-cycle",
        initialO2: "21",
        targetO2: "5",
        cycleHighPressure: "30",
      },
      label: "Piping pressure-cycle · NPS 8 · 200 ft",
    },
    {
      slug,
      spec: "custom-dilution-50m3",
      query: {
        units: "metric",
        geometryType: "custom-volume",
        customVolume: "50",
        purgeMethod: "dilution-sweep",
        initialO2: "21",
        targetO2: "2",
        purgeFlowRate: "80",
        mixingEfficiency: "0.8",
      },
      label: "Custom dilution · 50 m³",
    },
  ];
}
