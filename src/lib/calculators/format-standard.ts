/** Display published code editions in calculator chrome. */
export function formatCodeStandard(standard?: string): string | undefined {
  if (!standard) return undefined;
  if (/\(\d{4}\s+Edition\)/i.test(standard)) return standard;

  if (/^ASME B31\.3\b/i.test(standard)) {
    const rest = standard.replace(/^ASME B31\.3\s*/i, "").trim();
    const edition = "ASME B31.3 (2022 Edition)";
    if (!rest) return edition;
    if (/appendix\s*c/i.test(rest)) return `${edition} · Appendix C`;
    return `${edition} · ${rest}`;
  }

  return standard;
}
