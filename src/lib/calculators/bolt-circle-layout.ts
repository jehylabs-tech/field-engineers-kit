/** Layout math so discs never overlap on the bolt circle (viewBox 0–100). */
export function layoutBoltCircle(n: number): {
  boltR: number;
  fontSize: number;
  ringR: number;
  guideR: number;
  strokeW: number;
} {
  const pad = 1.25;
  let boltR = Math.max(2.1, Math.min(9, 180 / n));
  let ringR = 50 - boltR - pad;
  const minGap = 1.08;
  const chord = 2 * ringR * Math.sin(Math.PI / n);
  if (chord < 2 * boltR * minGap) {
    boltR = Math.max(2.0, (ringR * Math.sin(Math.PI / n)) / minGap);
    ringR = 50 - boltR - pad;
  }
  const fontSize = Math.max(
    3.0,
    Math.min(boltR * 1.15, Math.min(9, 150 / n)),
  );
  const strokeW = n >= 32 ? 0.75 : n >= 20 ? 1.05 : 1.35;
  const guideR = Math.min(ringR * 0.92, ringR + boltR * 0.2);
  return { boltR, fontSize, ringR, guideR, strokeW };
}
