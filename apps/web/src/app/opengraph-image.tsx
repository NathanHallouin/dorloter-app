import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Dorloter — adopter, retrouver, prendre soin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #fff5f1 0%, #ffe4dc 45%, #f0eafd 100%)",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 80,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#e8634d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              color: "white",
            }}
          >
            🐾
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#1f1414",
              letterSpacing: "-0.02em",
            }}
          >
            Dorloter
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 88,
              fontWeight: 800,
              color: "#1f1414",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              maxWidth: 920,
            }}
          >
            <span>Adopter, retrouver,</span>
            <span style={{ color: "#e8634d" }}>prendre soin.</span>
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 32,
              color: "#564545",
              maxWidth: 880,
              lineHeight: 1.35,
            }}
          >
            Plateforme française pour adopter en refuge ou signaler un compagnon
            perdu ou trouvé.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 22,
            fontWeight: 600,
            color: "#7a5f5f",
          }}
        >
          <span
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.7)",
            }}
          >
            🏠 Refuges partenaires
          </span>
          <span
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.7)",
            }}
          >
            📍 Géolocalisé
          </span>
          <span
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.7)",
            }}
          >
            💛 Sans commission
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
