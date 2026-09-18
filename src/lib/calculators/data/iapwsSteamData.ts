/**
 * IAPWS-IF97 industrial formulation constants — Region 1 (liquid),
 * Region 2 (vapor / superheated), Region 4 (saturation line).
 *
 * Coefficients from IAPWS R7-97(2012) / ASME Steam Tables compact IF97.
 * Region 1 residual terms use CoolProp’s (π−7.1)^I form (n already signed).
 */

export const IAPWS_R = 0.461526; // kJ/(kg·K)
export const IAPWS_T_CRIT_K = 647.096;
export const IAPWS_P_CRIT_MPA = 22.064;
export const IAPWS_RHO_CRIT = 322.0; // kg/m³

/** Region 4 saturation-line coefficients (forward / backward). */
export const REG4_N = [
  0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2,
  0.1202082470247e5, -0.32325550322333e7, 0.1491517810856e2,
  -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849,
  0.65017534844798e3,
] as const;

/** Region 2 ideal-gas γ⁰: { J°, n° }. */
export const REG2_IDEAL: ReadonlyArray<{ j: number; n: number }> = [
  { j: 0, n: -0.96927686500217e1 },
  { j: 1, n: 0.10086655968018e2 },
  { j: -5, n: -0.5608791128302e-2 },
  { j: -4, n: 0.71452738081455e-1 },
  { j: -3, n: -0.40710498223928 },
  { j: -2, n: 0.14240819171444e1 },
  { j: -1, n: -0.4383951131945e1 },
  { j: 2, n: -0.28408632460772 },
  { j: 3, n: 0.21268463753307e-1 },
];

/** Region 2 residual γʳ: { I, J, n }. */
export const REG2_RES: ReadonlyArray<{ i: number; j: number; n: number }> = [
  { i: 1, j: 0, n: -0.0017731742473213 },
  { i: 1, j: 1, n: -0.017834862292358 },
  { i: 1, j: 2, n: -0.045996013696365 },
  { i: 1, j: 3, n: -0.057581259083432 },
  { i: 1, j: 6, n: -0.05032527872793 },
  { i: 2, j: 1, n: -0.000033032641670203 },
  { i: 2, j: 2, n: -0.00018948987516315 },
  { i: 2, j: 4, n: -0.0039392777243355 },
  { i: 2, j: 7, n: -0.043797295650573 },
  { i: 2, j: 36, n: -0.000026674547914087 },
  { i: 3, j: 0, n: 2.0481737692309e-8 },
  { i: 3, j: 1, n: 4.3870667284435e-7 },
  { i: 3, j: 3, n: -0.00003227767723857 },
  { i: 3, j: 6, n: -0.0015033924542148 },
  { i: 3, j: 35, n: -0.040668253562649 },
  { i: 4, j: 1, n: -7.8847309559367e-10 },
  { i: 4, j: 2, n: 1.2790717852285e-8 },
  { i: 4, j: 3, n: 4.8225372718507e-7 },
  { i: 5, j: 7, n: 2.2922076337661e-6 },
  { i: 6, j: 3, n: -1.6714766451061e-11 },
  { i: 6, j: 16, n: -0.0021171472321355 },
  { i: 6, j: 35, n: -23.895741934104 },
  { i: 7, j: 0, n: -5.905956432427e-18 },
  { i: 7, j: 11, n: -1.2621808899101e-6 },
  { i: 7, j: 25, n: -0.038946842435739 },
  { i: 8, j: 8, n: 1.1256211360459e-11 },
  { i: 8, j: 36, n: -8.2311340897998 },
  { i: 9, j: 13, n: 1.9809712802088e-8 },
  { i: 10, j: 4, n: 1.0406965210174e-19 },
  { i: 10, j: 10, n: -1.0234747095929e-13 },
  { i: 10, j: 14, n: -1.0018179379511e-9 },
  { i: 16, j: 29, n: -8.0882908646985e-11 },
  { i: 16, j: 50, n: 0.10693031879409 },
  { i: 18, j: 57, n: -0.33662250574171 },
  { i: 20, j: 20, n: 8.9185845355421e-25 },
  { i: 20, j: 35, n: 3.0629316876232e-13 },
  { i: 20, j: 48, n: -4.2002467698208e-6 },
  { i: 21, j: 21, n: -5.9056029685639e-26 },
  { i: 22, j: 53, n: 3.7826947613457e-6 },
  { i: 23, j: 39, n: -1.2768608934681e-15 },
  { i: 24, j: 26, n: 7.3087610595061e-29 },
  { i: 24, j: 40, n: 5.5414715350778e-17 },
  { i: 24, j: 58, n: -9.436970724121e-7 },
];

/**
 * Region 1 residual (CoolProp sign convention):
 * γ = Σ n (π − 7.1)^I (τ − 1.222)^J , π = p/16.53 MPa, τ = 1386/T.
 */
export const REG1_RES: ReadonlyArray<{ i: number; j: number; n: number }> = [
  { i: 0, j: -2, n: 0.14632971213167 },
  { i: 0, j: -1, n: -0.84548187169114 },
  { i: 0, j: 0, n: -3.756360367204 },
  { i: 0, j: 1, n: 3.3855169168385 },
  { i: 0, j: 2, n: -0.95791963387872 },
  { i: 0, j: 3, n: 0.15772038513228 },
  { i: 0, j: 4, n: -0.016616417199501 },
  { i: 0, j: 5, n: 0.00081214629983568 },
  { i: 1, j: -9, n: -0.00028319080123804 },
  { i: 1, j: -7, n: 0.00060706301565874 },
  { i: 1, j: -1, n: 0.018990068218419 },
  { i: 1, j: 0, n: 0.032529748770505 },
  { i: 1, j: 1, n: 0.021841717175414 },
  { i: 1, j: 3, n: 0.00005283835796993 },
  { i: 2, j: -3, n: -0.00047184321073267 },
  { i: 2, j: 0, n: -0.00030001780793026 },
  { i: 2, j: 1, n: 0.000047661393906987 },
  { i: 2, j: 3, n: -4.4141845330846e-6 },
  { i: 2, j: 17, n: -7.2694996297594e-16 },
  { i: 3, j: -4, n: 0.000031679644845054 },
  { i: 3, j: 0, n: 2.8270797985312e-6 },
  { i: 3, j: 6, n: 8.5205128120103e-10 },
  { i: 4, j: -5, n: -0.0000022425281908 },
  { i: 4, j: -2, n: -6.5171222895601e-7 },
  { i: 4, j: 10, n: -1.4341729937924e-13 },
  { i: 5, j: -8, n: 4.0516996860117e-7 },
  { i: 8, j: -11, n: -1.2734301741641e-9 },
  { i: 8, j: -6, n: -1.7424871230634e-10 },
  { i: 21, j: -29, n: 6.8762131295531e-19 },
  { i: 23, j: -31, n: -1.4478307828521e-20 },
  { i: 29, j: -38, n: -2.6335781662795e-23 },
  { i: 30, j: -39, n: -1.1947622640071e-23 },
  { i: 31, j: -40, n: -1.8228094581404e-24 },
  { i: 32, j: -41, n: -9.3537087292458e-26 },
];

export type GibbsDerivs = {
  g: number;
  gPi: number;
  gTau: number;
};

function powSafe(base: number, exp: number): number {
  if (exp === 0) return 1;
  if (base === 0) return exp > 0 ? 0 : Infinity;
  return Math.pow(base, exp);
}

/** Region 2 Gibbs γ⁰ + γʳ and first derivatives at π, τ. */
export function region2Gibbs(pi: number, tau: number): GibbsDerivs {
  let g0 = Math.log(pi);
  let g0Pi = 1 / pi;
  let g0Tau = 0;
  for (const t of REG2_IDEAL) {
    const tj = powSafe(tau, t.j);
    g0 += t.n * tj;
    if (t.j !== 0) g0Tau += t.n * t.j * powSafe(tau, t.j - 1);
  }

  const b = tau - 0.5;
  let gr = 0;
  let grPi = 0;
  let grTau = 0;
  for (const t of REG2_RES) {
    const piI = powSafe(pi, t.i);
    const bJ = powSafe(b, t.j);
    gr += t.n * piI * bJ;
    grPi += t.n * t.i * powSafe(pi, t.i - 1) * bJ;
    if (t.j !== 0) grTau += t.n * piI * t.j * powSafe(b, t.j - 1);
  }

  return {
    g: g0 + gr,
    gPi: g0Pi + grPi,
    gTau: g0Tau + grTau,
  };
}

/** Region 1 Gibbs γ and first derivatives (residual only). */
export function region1Gibbs(pi: number, tau: number): GibbsDerivs {
  const piTerm = pi - 7.1;
  const tauTerm = tau - 1.222;
  let g = 0;
  let gPi = 0;
  let gTau = 0;
  for (const t of REG1_RES) {
    const pI = powSafe(piTerm, t.i);
    const tJ = powSafe(tauTerm, t.j);
    g += t.n * pI * tJ;
    if (t.i !== 0) gPi += t.n * t.i * powSafe(piTerm, t.i - 1) * tJ;
    if (t.j !== 0) gTau += t.n * pI * t.j * powSafe(tauTerm, t.j - 1);
  }
  return { g, gPi, gTau };
}

export type ThermoState = {
  v: number; // m³/kg
  h: number; // kJ/kg
  s: number; // kJ/(kg·K)
  rho: number; // kg/m³
};

/**
 * Region 2 properties at T [K], p [MPa].
 * Uses IAPWS unit convention: R [kJ/(kg·K)], p [MPa] → v [m³/kg] via /1000.
 */
export function region2Props(tK: number, pMpa: number): ThermoState {
  const pStar = 1;
  const tStar = 540;
  const pi = pMpa / pStar;
  const tau = tStar / tK;
  const g = region2Gibbs(pi, tau);
  const v = (IAPWS_R * tK * pi * g.gPi) / pMpa / 1000;
  const h = IAPWS_R * tK * tau * g.gTau;
  const s = IAPWS_R * (tau * g.gTau - g.g);
  return { v, h, s, rho: 1 / v };
}

/** Region 1 properties at T [K], p [MPa]. */
export function region1Props(tK: number, pMpa: number): ThermoState {
  const pStar = 16.53;
  const tStar = 1386;
  const pi = pMpa / pStar;
  const tau = tStar / tK;
  const g = region1Gibbs(pi, tau);
  const v = (IAPWS_R * tK * pi * g.gPi) / pMpa / 1000;
  const h = IAPWS_R * tK * tau * g.gTau;
  const s = IAPWS_R * (tau * g.gTau - g.g);
  return { v, h, s, rho: 1 / v };
}

/** IAPWS-IF97 Region 4 saturation pressure [MPa] at T [K]. */
export function iapwsSaturationPressureMpa(tK: number): number {
  if (!(tK >= 273.15) || tK >= IAPWS_T_CRIT_K) return NaN;
  const n = REG4_N;
  const theta = tK + n[8] / (tK - n[9]);
  const A = theta * theta + n[0] * theta + n[1];
  const B = n[2] * theta * theta + n[3] * theta + n[4];
  const C = n[5] * theta * theta + n[6] * theta + n[7];
  const disc = B * B - 4 * A * C;
  if (!(disc >= 0) || A === 0) return NaN;
  return Math.pow((2 * C) / (-B + Math.sqrt(disc)), 4);
}

/**
 * Saturation temperature [K] at p [MPa] — Region 4 backward equation
 * (IAPWS R7-97 Eq. 31; analytic, no Newton).
 */
export function iapwsSaturationTemperatureK(pMpa: number): number {
  if (!(pMpa > 611.657e-6) || pMpa >= IAPWS_P_CRIT_MPA) return NaN;
  const n = REG4_N;
  const beta = Math.pow(pMpa, 0.25);
  const E = beta * beta + n[2] * beta + n[5];
  const F = n[0] * beta * beta + n[3] * beta + n[6];
  const G = n[1] * beta * beta + n[4] * beta + n[7];
  const disc = F * F - 4 * E * G;
  if (!(disc >= 0) || E === 0) return NaN;
  const D = (2 * G) / (-F - Math.sqrt(disc));
  const n10 = n[9];
  const n9 = n[8];
  const inner = (n10 + D) * (n10 + D) - 4 * (n9 + n10 * D);
  if (!(inner >= 0)) return NaN;
  return (n10 + D - Math.sqrt(inner)) / 2;
}

/**
 * IAPWS 2008 industrial viscosity [Pa·s] as μ*(T̄, ρ̄).
 * Adequate for steam / liquid screening (not critical-enhancement).
 */
export function iapwsViscosityPaS(tK: number, rhoKgM3: number): number {
  const tBar = tK / IAPWS_T_CRIT_K;
  const rhoBar = rhoKgM3 / IAPWS_RHO_CRIT;
  const h = [
    1.67752, 2.20462, 0.6366564, -0.241605,
  ];
  let mu0 = 0;
  for (let i = 0; i < 4; i++) mu0 += h[i] / Math.pow(tBar, i);
  mu0 = 100 * Math.sqrt(tBar) / mu0;

  const H: number[][] = [
    [0.520094, 0.0850895, -1.08374, -0.289555, 0, 0],
    [0.222531, 0.999115, 1.88797, 1.26613, 0, 0.120573],
    [-0.281378, -0.906851, -0.772479, -0.489737, -0.257040, 0],
    [0.161913, 0.257399, 0, 0, 0, 0],
    [-0.0325372, 0, 0, 0.0698452, 0, 0],
    [0, 0, 0, 0, 0.00872102, 0],
    [0, 0, 0, -0.00435673, 0, -0.000593264],
  ];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    let inner = 0;
    for (let j = 0; j < 6; j++) {
      inner += H[i][j] * Math.pow(rhoBar - 1, j);
    }
    sum += Math.pow(1 / tBar - 1, i) * inner;
  }
  const mu1 = Math.exp(rhoBar * sum);
  return 1e-6 * mu0 * mu1;
}

/**
 * Simplified IAPWS-aligned thermal conductivity [W/(m·K)] for steam / liquid
 * screening (industrial band — no critical enhancement).
 */
export function iapwsThermalConductivityWmK(
  tK: number,
  rhoKgM3: number,
): number {
  const tBar = tK / IAPWS_T_CRIT_K;
  const rhoBar = rhoKgM3 / IAPWS_RHO_CRIT;
  // Ideal-gas + excess industrial fit (Wagner / IF97 companion scale).
  const lambda0 =
    Math.sqrt(tBar) /
    (0.0102811 +
      0.0299621 / tBar +
      0.0156146 / (tBar * tBar) -
      0.00422464 / (tBar * tBar * tBar));
  const lambda1 =
    -0.39707 +
    0.400302 * rhoBar +
    1.06 *
      Math.exp(-0.171587 * Math.pow(rhoBar + 2.39219, 2));
  // Scale to W/(m·K); reference λ* ≈ 1e-3 → industrial factor tuned for steam.
  const k = 0.001 * (lambda0 + lambda1 * rhoBar);
  // Clamp to physical steam / water band for screening.
  if (rhoKgM3 < 200) {
    // Superheated / sat vapor: ~0.02–0.08 W/(m·K)
    return Math.min(0.12, Math.max(0.015, k * 0.85 + 0.02 * Math.sqrt(tBar)));
  }
  return Math.min(0.8, Math.max(0.4, 0.6 + 0.001 * (tK - 300)));
}
