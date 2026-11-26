// Social share image for collabrr.io (Open Graph and Twitter), rendered at build time.
// Bricolage Grotesque (SIL Open Font License) is bundled in assets/fonts.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Collabrr: a home for the discussions that outgrow Slack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const root = process.cwd();
  const [logo, bold, medium] = await Promise.all([
    readFile(path.join(root, "public/brand/collabrr-logo.png")),
    readFile(path.join(root, "assets/fonts/BricolageGrotesque-800.ttf")),
    readFile(path.join(root, "assets/fonts/BricolageGrotesque-500.ttf")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#f7f8fc",
          padding: "0 72px",
          fontFamily: "Bricolage",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoSrc} width={64} height={46} alt="" />
            <div style={{ fontSize: 38, fontWeight: 800, color: "#15162b", letterSpacing: -1 }}>Collabrr</div>
          </div>
          <div
            style={{
              marginTop: 48,
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.02,
              color: "#15162b",
              letterSpacing: -2.5,
            }}
          >
            A home for the discussions that outgrow Slack.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: "#545873" }}>
            The reasoning layer between chat and meetings, built first for distributed product teams.
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
          <img src={logoSrc} width={330} height={238} alt="" style={{ transform: "rotate(-4deg)" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bold, weight: 800, style: "normal" },
        { name: "Bricolage", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
