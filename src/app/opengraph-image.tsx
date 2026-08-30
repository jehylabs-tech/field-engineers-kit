import { ImageResponse } from "next/og";

export const alt = "FieldEngineersKit — Industrial Piping & Procurement Calculators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #ffffff 0%, #eef1ff 100%)",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#3D5AFE",
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#15181E",
            }}
          >
            FieldEngineersKit
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: "#15181E",
              lineHeight: 1.15,
              maxWidth: "960px",
            }}
          >
            Industrial Piping & Procurement Calculators
          </div>
          <div style={{ fontSize: 26, color: "#5B6270" }}>
            ASME B31.3 · B16.5 · B16.9 · B16.20 · B36.10M · ISA S75 · API RP 14E
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#8A909C",
          }}
        >
          <span>fieldengineerskit.com</span>
          <span>Reference calculations only</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
