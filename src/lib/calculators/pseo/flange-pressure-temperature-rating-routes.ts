/**
 * Pattern B: /calculator/flange-pressure-temperature-rating/{spec}
 * Spec token: group-{1-1|2-2}-class{N}-{T}{c|f}
 */

type Route = {
  slug: string;
  spec: string;
  query: Record<string, string>;
  label: string;
};

export function listFlangePtRatingPseoRoutes(slug: string): Route[] {
  return [
    {
      slug,
      spec: "group-1-1-class150-38c",
      query: {
        units: "metric",
        materialGroup: "1.1",
        flangeClass: "150",
        designTemperature: "38",
      },
      label: "Group 1.1 · Class 150 · 38 °C",
    },
    {
      slug,
      spec: "group-1-1-class300-200c",
      query: {
        units: "metric",
        materialGroup: "1.1",
        flangeClass: "300",
        designTemperature: "200",
      },
      label: "Group 1.1 · Class 300 · 200 °C",
    },
    {
      slug,
      spec: "group-1-1-class600-300c",
      query: {
        units: "metric",
        materialGroup: "1.1",
        flangeClass: "600",
        designTemperature: "300",
      },
      label: "Group 1.1 · Class 600 · 300 °C",
    },
    {
      slug,
      spec: "group-2-2-class150-100c",
      query: {
        units: "metric",
        materialGroup: "2.2",
        flangeClass: "150",
        designTemperature: "100",
      },
      label: "Group 2.2 · Class 150 · 100 °C",
    },
    {
      slug,
      spec: "group-1-1-class150-100f",
      query: {
        units: "imperial",
        materialGroup: "1.1",
        flangeClass: "150",
        designTemperature: "100",
      },
      label: "Group 1.1 · Class 150 · 100 °F",
    },
    {
      slug,
      spec: "group-1-1-class900-400c",
      query: {
        units: "metric",
        materialGroup: "1.1",
        flangeClass: "900",
        designTemperature: "400",
      },
      label: "Group 1.1 · Class 900 · 400 °C",
    },
    {
      slug,
      spec: "group-2-2-class300-400c",
      query: {
        units: "metric",
        materialGroup: "2.2",
        flangeClass: "300",
        designTemperature: "400",
      },
      label: "Group 2.2 · Class 300 · 400 °C",
    },
    {
      slug,
      spec: "group-2-2-class600-200f",
      query: {
        units: "imperial",
        materialGroup: "2.2",
        flangeClass: "600",
        designTemperature: "200",
      },
      label: "Group 2.2 · Class 600 · 200 °F",
    },
  ];
}
