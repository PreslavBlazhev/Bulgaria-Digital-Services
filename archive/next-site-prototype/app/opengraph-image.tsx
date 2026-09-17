import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/**
 * Default social card, rendered at build time.
 *
 * Uses system-available fonts only — loading a webfont here would add a
 * network fetch to every OG render for a marginal typographic gain.
 */
export const alt = `${SITE.short} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background:
            "linear-gradient(135deg, #08111f 0%, #101b2d 55%, #0b1a30 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Accent rule */}
        <div
          style={{
            display: "flex",
            width: 132,
            height: 4,
            borderRadius: 2,
            background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 104,
                height: 62,
                borderRadius: 999,
                border: "2px solid #3b82f6",
                color: "#f8fafc",
                fontSize: 27,
                fontWeight: 700,
                letterSpacing: 3,
              }}
            >
              BDS
            </div>
            <div
              style={{
                display: "flex",
                color: "#a8b3c7",
                fontSize: 21,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Bulgaria Digital Services
            </div>
          </div>

          <div
            style={{
              display: "flex",
              color: "#f8fafc",
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: -1.6,
              maxWidth: 940,
            }}
          >
            Digital infrastructure for ambitious businesses.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #22324a",
            paddingTop: 28,
            color: "#6f7d94",
            fontSize: 22,
          }}
        >
          <div style={{ display: "flex" }}>
            Websites · Commerce · Business Systems · Automation
          </div>
          <div style={{ display: "flex", color: "#60a5fa" }}>bds</div>
        </div>
      </div>
    ),
    size,
  );
}
