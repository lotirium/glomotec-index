import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "ATLAS · glomotec mobility intelligence preview";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          background:
            "linear-gradient(135deg, #0F2C5C 0%, #2B3E8F 60%, #00A2E9 130%)",
          color: "white",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "#00A2E9",
              boxShadow: "0 0 0 4px rgba(0,162,233,0.18)",
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            glomotec
          </span>
          <span
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            ·
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            ENGINE
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#00A2E9",
            }}
          >
            ATLAS preview
          </span>
          <span
            style={{
              fontSize: 92,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
              color: "white",
            }}
          >
            A common standard for global mobility, visualised.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "-0.005em",
            }}
          >
            Six rubrics · five regions · one engine
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            gMC v1.0
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
