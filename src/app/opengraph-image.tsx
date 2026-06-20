import { ImageResponse } from "next/og";

// Default social-share card for the whole site (LinkedIn, X, Slack, iMessage…).
// Rendered from code so copy/colours stay editable — no binary asset to keep in
// git. Brand tokens mirror globals.css (--brand-blue / --brand-orange).
// Next.js serves this at /opengraph-image and wires og:image automatically;
// Twitter falls back to it when no twitter-image is present.

export const alt =
  "Andoxa — La prospection commerciale, de la liste au rendez-vous.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_BLUE = "#0052d9";
const BRAND_ORANGE = "#ff6700";
const INK = "#18181b";
const MUTED = "#52525b";
const CANVAS = "#fafafa";

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
          background: CANVAS,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 14,
            background: BRAND_ORANGE,
          }}
        />

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: BRAND_BLUE,
            }}
          />
          <div style={{ fontSize: 52, fontWeight: 800, color: BRAND_BLUE }}>
            Andoxa
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            <div style={{ display: "flex" }}>La prospection commerciale,</div>
            <div style={{ display: "flex" }}>de la liste au rendez-vous.</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: MUTED }}>
            CRM · Campagnes LinkedIn · Booking · Workflows
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 30,
            fontWeight: 700,
            color: BRAND_BLUE,
          }}
        >
          andoxa.fr
        </div>
      </div>
    ),
    size
  );
}
