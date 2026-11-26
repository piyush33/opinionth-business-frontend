// 1-bit-era graphics for the marketing site, drawn as SVG rectangles with
// crisp edges so every "pixel" stays sharp at any size.
//
// The story: in 1968 Douglas Engelbart showed linked ideas on a shared
// bitmap screen. Collabrr's visual language borrows that era's dot-matrix,
// dithering and phosphor, rendered at today's resolution.

type Palette = Record<string, string>;

/** One rect per horizontal run of the same colour. */
function runs(rows: string[], palette: Palette) {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (palette[ch]) out.push({ x, y, w, fill: palette[ch] });
      x += w;
    }
  });
  return out;
}

export function Bitmap({
  rows,
  palette,
  className,
  title,
}: {
  rows: string[];
  palette: Palette;
  className?: string;
  title?: string;
}) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {runs(rows, palette).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** The Collabrr logo, sampled from the PNG at 40 × 28 pixels. */
export const LOGO_ROWS = [
  "...........cccccc..........ii...........",
  "..........cccccccccccc.iiiiiii..........",
  "..........ccccccccccccccccciiii.........",
  "..........cccccccccccccccccccccc........",
  ".........icccccccccccccccccccccccccc....",
  "....iiiiicccccccccccccccccccccccccccccc.",
  "..iiiiiiiccccccccccccccccccccccccccccccc",
  ".iiiiiiiiccccccccccccccccccccccccccccccc",
  ".iiiiiiiiccccccccccccccccccccccccccccccc",
  ".iiiiiiicccccccccccccccccccccccccccccccc",
  ".iiiiiiicccccccccccccccccccccccccccccccc",
  ".iiiiiiicccccccccccccccccccccccccccccccc",
  ".iiiiiiiccccccccwwccccccccwwcccccccccccc",
  "..iiiiiicccccccwwwwccccccwwwwcccccccccc.",
  "..iiiiiccccccccwwwwccccccwwwwcccccccccc.",
  "..iiiiicccccccccwwccccccccwwccccccccccc.",
  "..iiiiicccccccccccccwwwwccccccccccccccc.",
  "...iiiiccccccccccccccwwccccccccccccccc..",
  "...iiicccccccccccccccccccccccccccccccc..",
  "...iiicccccccccccccccccccccccccccccccc..",
  "...iiiiccccccccccccccccccccccccccccccc..",
  "...iiiiccccccccccccccccccccccccccccccc..",
  "...iiiiiicccccccccccccccccccccccccccc...",
  "...iiiiiiiiiiiccccccccccccccccccccccc...",
  "....iiiiiiiiiiiiiiicccccccccccccccccc...",
  "....iiiiiiiiiiiiiiiii..cccccccccccccc...",
  "....iiiiiiiiiiiii...........ccccccccc...",
  ".....iiiiiii.....................cc.....",
];

export const LOGO_PALETTE: Palette = {
  i: "var(--mk-indigo)",
  c: "var(--mk-cyan)",
  w: "#f4fbfd",
};

export function LogoBitmap({ className, title }: { className?: string; title?: string }) {
  return <Bitmap rows={LOGO_ROWS} palette={LOGO_PALETTE} className={className} title={title} />;
}

// 4 × 4 Bayer matrix, the classic ordered-dither pattern.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** A band that fades from solid to nothing, top to bottom, by ordered dithering. */
export function DitherBand({
  color = "var(--mk-ink)",
  cols = 192,
  rows = 10,
  flip = false,
  className = "",
}: {
  color?: string;
  cols?: number;
  rows?: number;
  flip?: boolean;
  className?: string;
}) {
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    const density = 1 - (y + 0.5) / rows; // 1 → 0
    let line = "";
    for (let x = 0; x < cols; x++) line += BAYER[y % 4][x % 4] / 16 < density ? "#" : ".";
    lines.push(line);
  }
  if (flip) lines.reverse();
  return <Bitmap rows={lines} palette={{ "#": color }} className={`block w-full ${className}`} />;
}

/** 12 × 12 pixel icons. */
export const ICONS: Record<string, string[]> = {
  chat: [
    "............",
    ".#########..",
    ".#.......#..",
    ".#.##.##.#..",
    ".#.......#..",
    ".###.#####..",
    "...#.#......",
    "...##.#####.",
    "......#...#.",
    "......#.#.#.",
    "......#####.",
    "............",
  ],
  clock: [
    "....####....",
    "..##....##..",
    ".#........#.",
    ".#...#....#.",
    "#....#.....#",
    "#....####..#",
    "#..........#",
    ".#........#.",
    ".#........#.",
    "..##....##..",
    "....####....",
    "............",
  ],
  network: [
    "##........##",
    "##........##",
    "..#......#..",
    "...#....#...",
    "....####....",
    "....####....",
    "....####....",
    "...#....#...",
    "..#......#..",
    "##........##",
    "##........##",
    "............",
  ],
  scale: [
    ".....##.....",
    ".##########.",
    ".#...##...#.",
    "#.#..##..#.#",
    "#.#..##..#.#",
    "###..##..###",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    "...######...",
    "..########..",
    "............",
  ],
  spark: [
    ".....#......",
    ".....#......",
    "....###.....",
    "..#######...",
    "....###.....",
    ".....#....#.",
    ".....#...###",
    "..........#.",
    "..#.........",
    ".###........",
    "..#.........",
    "............",
  ],
};

export function PixelIcon({ name, color = "var(--mk-ink)", className = "h-6 w-6" }: { name: keyof typeof ICONS; color?: string; className?: string }) {
  return <Bitmap rows={ICONS[name]} palette={{ "#": color }} className={className} />;
}

/**
 * Linked cards on a phosphor screen: the 1968 idea, in pixels. Nodes are
 * cards, edges are @id links, drawn on a 64 × 40 grid.
 */
export function LinkedCardsScreen({ className = "" }: { className?: string }) {
  const nodes = [
    { x: 6, y: 5, w: 14, h: 8, c: "var(--mk-cyan)" },
    { x: 40, y: 3, w: 16, h: 8, c: "var(--mk-indigo-bright)" },
    { x: 24, y: 17, w: 16, h: 9, c: "#f4fbfd" },
    { x: 4, y: 28, w: 14, h: 8, c: "var(--mk-indigo-bright)" },
    { x: 44, y: 27, w: 15, h: 9, c: "var(--mk-cyan)" },
  ];
  const edges = [
    [0, 2],
    [1, 2],
    [2, 3],
    [2, 4],
    [0, 1],
    [3, 4],
  ];
  const cx = (n: (typeof nodes)[number]) => n.x + Math.floor(n.w / 2);
  const cy = (n: (typeof nodes)[number]) => n.y + Math.floor(n.h / 2);
  // Bresenham, so the links are real pixel lines.
  const line = (a: number, b: number) => {
    const p: [number, number][] = [];
    let x0 = cx(nodes[a]), y0 = cy(nodes[a]);
    const x1 = cx(nodes[b]), y1 = cy(nodes[b]);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      p.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return p;
  };
  return (
    <svg viewBox="0 0 64 40" className={className} shapeRendering="crispEdges" aria-hidden>
      {edges.flatMap(([a, b], i) =>
        line(a, b).map(([x, y], j) => (j % 2 === 0 ? <rect key={`${i}-${j}`} x={x} y={y} width={1} height={1} fill="#5fd3e8" opacity={0.7} /> : null)),
      )}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} fill="var(--mk-ink)" />
          <rect x={n.x} y={n.y} width={n.w} height={n.h} fill="none" stroke={n.c} strokeWidth={1} transform="translate(0.5 0.5)" />
          <rect x={n.x + 2} y={n.y + 2} width={n.w - 6} height={1} fill={n.c} />
          <rect x={n.x + 2} y={n.y + 4} width={n.w - 4} height={1} fill={n.c} opacity={0.55} />
          {n.h > 8 && <rect x={n.x + 2} y={n.y + 6} width={n.w - 8} height={1} fill={n.c} opacity={0.55} />}
        </g>
      ))}
    </svg>
  );
}
