import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

type InCard = {
  id: number;
  title?: string;
  description?: string;
  text?: string;
  username?: string;
  category?: string;
  phase?: string; // display label of the phase group
  roleTypes?: string[];
  createdAt?: string;
  weblink?: string;
};

type InBody = {
  layerId?: number;
  category?: string;
  phases: string[]; // ordered phase labels that have cards
  cards: InCard[];
  force?: boolean;
};

export type SpaceSummary = {
  topic: string;
  tagline: string;
  overview: string;
  themes: string[];
  momentum: string;
  phases: {
    phase: string;
    summary: string;
    keyPoints: string[];
    keyCardIds: number[];
  }[];
  generatedAt: string;
  cardCount: number;
};

const MAX_CARDS = 200;
const MAX_FIELD = 700;

// Small in-memory cache so repeated opens of the same space don't re-bill.
const cache = new Map<string, { at: number; data: SpaceSummary }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

const clip = (s: unknown, n = MAX_FIELD) => {
  const str = typeof s === "string" ? s : "";
  const flat = str.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    topic: {
      type: "STRING",
      description: "The general topic of the whole space, 2-6 words, title case.",
    },
    tagline: {
      type: "STRING",
      description: "One crisp sentence (max ~18 words) framing what this space is about.",
    },
    overview: {
      type: "STRING",
      description:
        "Collective summary of the entire space across all phases, 3-5 sentences, plain prose.",
    },
    themes: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3-6 short recurring themes (1-3 words each).",
    },
    momentum: {
      type: "STRING",
      description:
        "One sentence on where the space currently stands / what is likely next.",
    },
    phases: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phase: {
            type: "STRING",
            description: "Exactly one of the provided phase labels.",
          },
          summary: { type: "STRING", description: "2-3 sentence summary of this phase." },
          keyPoints: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "2-4 concise bullet points.",
          },
          keyCardIds: {
            type: "ARRAY",
            items: { type: "INTEGER" },
            description: "Up to 3 ids of the most representative cards in this phase.",
          },
        },
        required: ["phase", "summary", "keyPoints", "keyCardIds"],
      },
    },
  },
  required: ["topic", "tagline", "overview", "themes", "momentum", "phases"],
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured (GEMINI_API_KEY missing)." },
      { status: 500 },
    );
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let body: InBody;
  try {
    body = (await req.json()) as InBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cards = Array.isArray(body.cards) ? body.cards.slice(0, MAX_CARDS) : [];
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "This space has no cards to summarize yet." },
      { status: 400 },
    );
  }
  const phases = (Array.isArray(body.phases) ? body.phases : []).filter(
    (p) => typeof p === "string" && p.trim(),
  );

  const compact = cards.map((c) => ({
    id: c.id,
    phase: clip(c.phase, 60) || "Uncategorized",
    title: clip(c.title, 160),
    description: clip(c.description),
    text: clip(c.text),
    author: clip(c.username, 40),
    roles: (c.roleTypes ?? []).slice(0, 6),
    date: c.createdAt ? String(c.createdAt).slice(0, 10) : undefined,
    link: c.weblink ? true : undefined,
  }));

  const cacheKey = createHash("sha256")
    .update(JSON.stringify({ m: model, cat: body.category, phases, compact }))
    .digest("hex");
  const hit = cache.get(cacheKey);
  if (!body.force && hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...hit.data, cached: true });
  }

  const prompt = [
    "You are summarizing a collaborative workspace (a \"connected collection\") made of cards posted by team members.",
    `Space category: ${body.category || "unspecified"}.`,
    `Phases present, in workflow order: ${phases.join(" → ") || "none"}.`,
    "Write for the team members themselves: specific, factual, grounded only in the cards. No hype, no filler, do not invent facts.",
    "Produce one entry in `phases` for every phase listed above, in the same order, using the exact phase label.",
    "keyCardIds must only contain ids of cards that belong to that phase.",
    "",
    "Cards (JSON):",
    JSON.stringify(compact),
  ].join("\n");

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
  } catch (e) {
    console.error("[space-summary] network error", e);
    return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[space-summary] gemini error", res.status, detail.slice(0, 500));
    return NextResponse.json(
      { error: `AI service error (${res.status}).` },
      { status: 502 },
    );
  }

  const json = await res.json();
  const raw: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!raw) {
    return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
  }

  let parsed: Omit<SpaceSummary, "generatedAt" | "cardCount">;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI returned malformed output." }, { status: 502 });
  }

  // Sanitize: keep only real card ids within the right phase, keep phase order.
  const idsByPhase = new Map<string, Set<number>>();
  compact.forEach((c) => {
    if (!idsByPhase.has(c.phase)) idsByPhase.set(c.phase, new Set());
    idsByPhase.get(c.phase)!.add(c.id);
  });
  const order = new Map(phases.map((p, i) => [p, i]));
  const phaseEntries = (parsed.phases ?? [])
    .filter((p) => idsByPhase.has(p.phase))
    .map((p) => ({
      phase: p.phase,
      summary: p.summary ?? "",
      keyPoints: (p.keyPoints ?? []).slice(0, 4),
      keyCardIds: (p.keyCardIds ?? [])
        .filter((id) => idsByPhase.get(p.phase)!.has(id))
        .slice(0, 3),
    }))
    .sort((a, b) => (order.get(a.phase) ?? 99) - (order.get(b.phase) ?? 99));

  const data: SpaceSummary = {
    topic: parsed.topic ?? "Untitled Space",
    tagline: parsed.tagline ?? "",
    overview: parsed.overview ?? "",
    themes: (parsed.themes ?? []).slice(0, 6),
    momentum: parsed.momentum ?? "",
    phases: phaseEntries,
    generatedAt: new Date().toISOString(),
    cardCount: compact.length,
  };

  cache.set(cacheKey, { at: Date.now(), data });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  return NextResponse.json(data);
}
