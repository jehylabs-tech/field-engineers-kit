export type PresetOption = {
  value: string;
  label: string;
};

export const FITTING_VALVE_NPS_CHIPS: PresetOption[] = [
  { value: "2", label: '2"' },
  { value: "3", label: '3"' },
  { value: "4", label: '4"' },
  { value: "6", label: '6"' },
  { value: "8", label: '8"' },
  { value: "12", label: '12"' },
];

export const COMMON_NPS_CHIPS: PresetOption[] = [
  { value: "2", label: '2"' },
  { value: "4", label: '4"' },
  { value: "6", label: '6"' },
  { value: "8", label: '8"' },
  { value: "10", label: '10"' },
  { value: "12", label: '12"' },
];

export const COMMON_CLASS_CHIPS: PresetOption[] = [
  { value: "150", label: "150#" },
  { value: "300", label: "300#" },
  { value: "600", label: "600#" },
  { value: "900", label: "900#" },
  { value: "1500", label: "1500#" },
];

export const COMMON_SCHEDULE_CHIPS: PresetOption[] = [
  { value: "40", label: "Sch 40" },
  { value: "80", label: "Sch 80" },
  { value: "10S", label: "10S" },
  { value: "40S", label: "40S" },
  { value: "160", label: "Sch 160" },
];

export const FLANGE_TYPE_CHIPS: PresetOption[] = [
  { value: "wn", label: "WN" },
  { value: "bl", label: "BL" },
  { value: "so", label: "SO" },
  { value: "sw", label: "SW" },
];

export const FACING_CHIPS: PresetOption[] = [
  { value: "rf", label: "RF" },
  { value: "ff", label: "FF" },
  { value: "rtj", label: "RTJ" },
];

export const METRIC_OD_CHIPS: PresetOption[] = [
  { value: "60.3", label: '2"' },
  { value: "88.9", label: '3"' },
  { value: "114.3", label: '4"' },
  { value: "168.3", label: '6"' },
  { value: "219.1", label: '8"' },
];

export const IMPERIAL_OD_CHIPS: PresetOption[] = [
  { value: "2.375", label: '2"' },
  { value: "3.5", label: '3"' },
  { value: "4.5", label: '4"' },
  { value: "6.625", label: '6"' },
  { value: "8.625", label: '8"' },
];

export function chipsInOptions(
  chips: PresetOption[],
  options: PresetOption[],
): PresetOption[] {
  const allowed = new Set(options.map((item) => item.value));
  return chips.filter((chip) => allowed.has(chip.value));
}
