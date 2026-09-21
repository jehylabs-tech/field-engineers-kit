/**
 * TEMA Section 5 LMTD correction factor F for 1 shell pass /
 * even tube passes, with N identical shell passes in series.
 *
 * Closed-form Bowman / TEMA relations — no tabulated coefficients.
 */

/** Single-shell (1–2 pass) F from temperature-effectiveness P and capacity ratio R. */
export function temaFFactor1Shell(P: number, R: number): number {
  if (!(P > 0) || !(P < 1) || !(R >= 0) || !Number.isFinite(P) || !Number.isFinite(R)) {
    return NaN;
  }
  if (R * P >= 1 - 1e-12) return NaN;

  if (Math.abs(R - 1) < 1e-9) {
    const S = Math.SQRT2;
    const num = P * S;
    const den =
      (1 - P) *
      Math.log((2 - P * (2 - S)) / (2 - P * (2 + S)));
    if (!(Math.abs(den) > 1e-14)) return NaN;
    const F = num / den;
    return Number.isFinite(F) && F > 0 && F <= 1.05 ? Math.min(1, F) : NaN;
  }

  const S = Math.sqrt(R * R + 1);
  const num = (S / (R - 1)) * Math.log((1 - P) / (1 - R * P));
  const den = Math.log(
    (2 - P * (R + 1 - S)) / (2 - P * (R + 1 + S)),
  );
  if (!(Math.abs(den) > 1e-14)) return NaN;
  const F = num / den;
  return Number.isFinite(F) && F > 0 && F <= 1.05 ? Math.min(1, F) : NaN;
}

/**
 * Multi-shell F: map overall P,R to equivalent single-shell P₁ then F₁(P₁,R).
 * N = number of shell passes in series (1, 2, or 4 in FEK UI).
 */
export function temaFFactor(P: number, R: number, shellPasses = 1): number {
  const N = Math.max(1, Math.round(shellPasses));
  if (!(P > 0) || !(P < 1) || !(R >= 0)) return NaN;
  if (R * P >= 1 - 1e-12) return NaN;

  let P1 = P;
  if (N > 1) {
    if (Math.abs(R - 1) < 1e-9) {
      const den = N - P * (N - 1);
      if (!(den > 1e-12)) return NaN;
      P1 = P / den;
    } else {
      const ratio = (1 - P * R) / (1 - P);
      if (!(ratio > 0)) return NaN;
      const W = Math.pow(ratio, 1 / N);
      const den = R - W;
      if (!(Math.abs(den) > 1e-12)) return NaN;
      P1 = (1 - W) / den;
    }
  }

  if (!(P1 > 0) || !(P1 < 1)) return NaN;
  return temaFFactor1Shell(P1, R);
}
