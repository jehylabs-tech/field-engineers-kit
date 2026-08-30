# Field Engineer Kit — Engineering Verification Report

**Date:** 2026-08-15  
**Scope:** 15 published calculators (`data/calculators/localSeed.json`)  
**Runner:** `npm test` (Vitest) — **28/28 passed**  
**Relative tolerance:** 0.01% on closed-form kernels; table lookups compared to ASME/API handbook values

Run locally:

```bash
npm test
```

---

## Summary table

| No. | Calculator | Principal formula / standard | Benchmark result | Notes (edges / auto-fixes) |
| :--- | :--- | :--- | :--- | :--- |
| 01 | ASME B31.3 Pipe Thickness | \(t = PD / [2(SE+PY)] + c\), Y = 0.4 (ferritic ≤ 482 °C) | **PASS** (error < 0.01%) | NPS 4 Sch 40, A106 Gr.B, 20 bar, 100 °C: \(t_{min}\) = **0.8235 mm**. Sch 40 (6.02 mm) remains adequate. Old engine used \(2SE-0.2P\) (B31.1-style); replaced with B31.3 304.1.2(a). P ≤ 0 → hero `—`. |
| 02 | Pipe Schedule & Dimension | ASME B36.10M table | **PASS** (data match) | NPS 4 Sch 40: OD 114.3 mm, t 6.02 mm, ID 102.26 mm. Unknown NPS/schedule → `—`. |
| 03 | Flange Dimension & Weight | ASME B16.5 WN RF table | **PASS** (data match) | NPS 4 Class 150: OD 228.6 mm, 8 bolts, ~10 kg (screening weight). |
| 04 | Fitting & Valve Face-to-Face | ASME B16.10 / B16.9 | **PASS** (data corrected) | Gate NPS 4 Cl.150 FTF **229 mm** (was 254). 90° LR elbow NPS 4 A **152 mm** (was 114, which is the pipe OD). Tee/globe/check rows aligned to handbook. Weights remain catalog estimates. |
| 05 | Gasket Dimension & Selection | ASME B16.20 | **PASS** (data match) | NPS 4 Cl.150 spiral-wound outer-ring OD 190.5 mm. |
| 06 | Valve Cv Sizing | ISA/IEC liquid: \(C_v = Q_{gpm}\sqrt{SG/\Delta P_{psi}}\) | **PASS** (error < 0.01%) | 120 m³/h, ΔP 3 bar, SG 1 → **Cv ≈ 80.10**. Previous engine treated m³/h and bar as if they were gpm/psi (Kv mixed as Cv). Gas P1≤P2 → `—`, not NaN. |
| 07 | Bolt Torque & Tensioning | ASME PCC-1 assembly table | **PASS** (data match) | NPS 4 Class 150: **190 N·m**, 8 × 5/8″, star sequence. Standard badge is PCC-1 (not B16.5). |
| 08 | Blind Flange Thickness | B31.3 304.4.1 / VIII-1 UG-34 \(t = d\sqrt{0.3P/SE}+c\) | **PASS** (error < 0.01%) | C = 0.30 (was 3/16). d = 102.26 mm, P = 2.5 MPa, S = 138 MPa, c = 3 mm. P ≤ 0 → `—`. |
| 09 | Metal Weight & Cost | \(m = \rho V\) | **PASS** (error < 0.01%) | 3000×1500×12 mm CS plate = **423.9 kg**. Imperial lengths were wrongly treated as mm; now inch → m (`× 0.0254`). |
| 10 | Hydro Test Pressure | B31.3 345.4.2: \(P_t = 1.5\,P\,(S_t/S)\) | **PASS** (error < 0.01%) | St/S default 1.0, cap 6.5. 2.5 MPa × 1.5 = **3.75 MPa**. St/S = 1.2 → **4.5 MPa**. |
| 11 | Thermal Expansion Loop | \(\Delta L = \alpha L \Delta T\) | **PASS** (error < 0.01%) | CS α = 12.1×10⁻⁶ /°C, L = 20 m, 21→150 °C → **+31.22 mm**. Length ≤ 0 → 0, not NaN. −300 °C still finite. |
| 12 | Pressure Drop (friction) | Darcy–Weisbach + Haaland \(f\), ε = 45 µm steel | **PASS** (error < 0.01% vs independent Haaland) | Water 20 °C **ρ = 998 kg/m³** (not 1000). 100 m, 4 in Sch 40, 50 m³/h, **no fittings**: v ≈ **1.691 m/s**, f ≈ **0.01858**, **ΔP ≈ 0.259 bar**. GPM/ft round-trip matches. Q = 0 → `—`. |
| 13 | Flow Velocity & Erosion | \(v = Q/A\), API RP 14E \(v_c = C/\sqrt{\rho}\) (fps, lb/ft³) | **PASS** (error < 0.01%) | Same line: v ≈ **1.691 m/s**, c = 100, ρ = 998 → **vc ≈ 3.862 m/s** → Safe. 130 m³/h → Erosion Risk. Q = 0 → `—`. |
| 14 | Material Equivalent Finder | ASTM / EN / DIN / JIS / KS table | **PASS** (row match) | A106 Gr.B → EN **P265GH**, JIS **STPG370**. Screening table — mill cert still required. |
| 15 | Unit Converter | SI factors (bar/psi, in/mm, °C/°F/K) | **PASS** (round-trip < 0.01%) | 20 bar = **290.075 psi**; 1 in = 25.4 mm; 0 °C = 32 °F = 273.15 K. `PSI_TO_BAR` aligned with engineering.ts (`14.5037738`). Non-finite input → `—`. |

---

## Representative handbook cases

### ASME B31.3 \(t_{min}\) — NPS 4 Sch 40, A106 Gr.B, 20 bar, 100 °C

| Input | Value |
| :--- | :--- |
| D | 114.3 mm (B36.10M) |
| P | 2.0 MPa (20 bar) |
| S | 138 MPa (A106 Gr.B, ≤ 204 °C Class 323) |
| E | 1.0 (seamless) |
| Y | 0.4 |
| c | 0 |

\[
t = \frac{2.0 \times 114.3}{2(138 + 2.0\times 0.4)} = 0.8235\ \mathrm{mm}
\]

Sch 40 wall 6.02 mm ⇒ **Pass** (mill tolerance not applied; field screening only).

### Darcy–Weisbach — water, 100 m, 4 in Sch 40, 50 m³/h

Engine fluid card is **Water (20 °C), 998 kg/m³, 0.001 Pa·s**. User sample ρ = 1000 kg/m³ would be ~0.2% higher ΔP.

| Quantity | Value |
| :--- | :--- |
| ID | 102.26 mm |
| v | 1.691 m/s |
| Re | 1.73×10⁵ (turbulent) |
| f (Haaland, ε = 45 µm) | 0.01858 |
| Fittings | 0 (benchmark case) |
| **ΔP** | **0.259 bar** |

Imperial path (GPM + ft) round-trips to the same bar result within 0.05%.

### API RP 14E

\[
v_c\ [\mathrm{ft/s}] = \frac{C}{\sqrt{\rho\ [\mathrm{lb/ft^3}]}}
\]

C = 100 (continuous, corrosive), ρ = 998 kg/m³ = 62.30 lb/ft³ → **vc = 3.86 m/s**. At 50 m³/h, v/vc ≈ 44% → **Safe**. Warning at 0.8 vc or liquid v > 3.5 m/s; **Erosion Risk** when v ≥ vc.

---

## Edge / unit policy (all 15)

| Check | Behaviour |
| :--- | :--- |
| Division by zero (ΔP = 0, S = 0, A = 0, Q = 0) | Finite fallback `0` or hero `—` + warn copy |
| Negative P, D, length, flow | Treated as invalid; no `Infinity` |
| Extreme T (−300 °C) | Thermal ΔL remains finite; gas Cv returns 0 if T ≤ −273.15 °C |
| Imperial ↔ metric | Length/pressure/flow kernels share SI internally; display formatters no longer double-convert hydro/blind P |
| NaN in UI strings | Hero/rows use `—` instead of printing `NaN` |

---

## Auto-fixes applied in this pass

1. **B31.3 wall** — `PD/(2SE − 0.2P)` → `PD/(2(SE + PY))`.
2. **Liquid Cv** — convert m³/h→gpm and bar→psi (US \(C_v\)); gas non-choked Crane/ISA square-root guarded.
3. **Hydro test** — imperial design P converted psi→MPa before 1.5× / 1.1×.
4. **Blind flange** — display P in the same unit the user typed; invalid P/d/S → `—`.
5. **Metal weight** — imperial linear dimensions interpreted as inches.
6. **B16.10 / B16.9 tables** — gate/globe/check FTF and LR elbow / equal-tee center-to-end corrected to handbook millimetres.
7. **Pressure constants** — `barToPsi` / converter psi factor unified at **14.5037738**.
8. **Exported kernels** for tests: `requiredPipeWallThickness`, `computePressureDrop`, `computeFlowVelocity`, `apiRp14eLimitMs`, `hydroTestPressureMpa`, `liquidCvUs`, `thermalExpansionDeltaLMm`, `metalWeightKg`, `requiredBlindThicknessMm`.

---

## Out of scope / remaining screening caveats

- Lookup **weights** (flanges, fittings, valves) are catalog estimates, not certified mill masses.
- Valve **gas Cv** is a simplified non-choked ISA/Crane form (not full IEC 60534-2-1 with *xT*, *Fγ*, choked flow).
- Pressure drop fittings use Crane equivalent lengths (ell 30, gate 8, globe 340); K-factor method is not offered.
- Thermal loop legs are B31.3 **guided-cantilever screening**, not a flexibility computer analysis.
- Material equivalents are a screening table, not a substitution approval.
