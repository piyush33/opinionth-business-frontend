// Social share image for collabrr.io (Open Graph and Twitter), rendered at build time.
// Inter (SIL Open Font License) is bundled in assets/fonts; the pixel logo is drawn
// from the same rows the site uses.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOGO_ROWS } from "@/components/marketing/Bitmap";

export const alt = "Collabrr: a home for the discussions that outgrow chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0d0e18";
const PAPER = "#f3f4f7";
const COLORS: Record<string, string> = { i: "#4f50ef", c: "#0ea3c3", w: "#f4fbfd" };

/** Rows of runs, as flex rows of divs (the image renderer has no SVG rects). */
function PixelRows({ rows, px, colors }: { rows: string[]; px: number; colors: Record<string, string> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((row, y) => {
        const cells: { w: number; c?: string }[] = [];
        let x = 0;
        while (x < row.length) {
          const ch = row[x];
          let w = 1;
          while (x + w < row.length && row[x + w] === ch) w++;
          cells.push({ w, c: colors[ch] });
          x += w;
        }
        return (
          <div key={y} style={{ display: "flex", height: px }}>
            {cells.map((cell, i) => (
              <div key={i} style={{ width: cell.w * px, height: px, background: cell.c ?? "transparent" }} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
function ditherRows(cols: number, rows: number) {
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    const density = (y + 0.5) / rows; // sparse at top, solid at bottom
    let line = "";
    for (let x = 0; x < cols; x++) line += BAYER[y % 4][x % 4] / 16 < density ? "#" : ".";
    out.push(line);
  }
  return out;
}

export default async function OpengraphImage() {
  const root = process.cwd();
  const [bold, medium] = await Promise.all([
    readFile(path.join(root, "assets/fonts/Inter-800.ttf")),
    readFile(path.join(root, "assets/fonts/Inter-500.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, fontFamily: "Inter" }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 72px" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 12, height: 12, background: "#4f50ef" }} />
              <div style={{ fontSize: 26, fontWeight: 800, color: INK, letterSpacing: -0.8 }}>Collabrr</div>
            </div>
            <div style={{ marginTop: 34, fontSize: 76, fontWeight: 800, lineHeight: 0.98, color: INK, letterSpacing: -3.4 }}>
              A home for the discussions that outgrow chat
            </div>
            <div style={{ marginTop: 28, fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: "#4a4e62", letterSpacing: -0.4 }}>
              The reasoning layer between quick chat and finished docs, built first for distributed product teams.
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
            <PixelRows rows={LOGO_ROWS} px={9} colors={COLORS} />
          </div>
        </div>
        <PixelRows rows={ditherRows(150, 6)} px={8} colors={{ "#": INK }} />
        <div style={{ height: 22, background: INK }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: bold, weight: 800, style: "normal" },
        { name: "Inter", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
