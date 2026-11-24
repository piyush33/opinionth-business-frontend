import { NextResponse } from "next/server";
import {
  MAX_CARDS,
  compactCards,
  geminiConfig,
  geminiJson,
  loadSaved,
  readSpace,
  saveResult,
  sha256,
  type SpaceBody,
} from "@/lib/ai/server";

export const runtime = "nodejs";

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

const PROMPT_VERSION = 1;

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
  const { apiKey, model } = geminiConfig();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured (GEMINI_API_KEY missing)." },
      { status: 500 },
    );
  }

  let body: SpaceBody;
  try {
    body = (await req.json()) as SpaceBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sp = readSpace(req, body);
  if (!sp.ok) {
    return NextResponse.json({ error: sp.error }, { status: sp.status });
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
  const compact = compactCards(cards);

  // Fingerprint of everything the summary depends on. Bump PROMPT_VERSION
  // when the prompt or schema changes so saved summaries regenerate.
  const signature = sha256({ v: PROMPT_VERSION, m: model, cat: body.category, phases, compact });

  // Saved summary lookup doubles as the access check, so it runs even
  // when `force` skips the saved copy.
  const saved = await loadSaved<SpaceSummary>(sp.space, signature);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }
  if (!body.force && saved.value) {
    return NextResponse.json({ ...saved.value, cached: true });
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

  const out = await geminiJson<Omit<SpaceSummary, "generatedAt" | "cardCount">>({
    apiKey,
    model,
    prompt,
    schema: RESPONSE_SCHEMA,
    // Default thinking took 20-23s on a 32-card space, close to Amplify's
    // 28s request limit; a small budget keeps some reasoning at ~11s.
    thinkingBudget: 1024,
    tag: "space-summary",
  });
  if (!out.ok) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  const parsed = out.value;
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

  await saveResult(sp.space, signature, model, data);

  return NextResponse.json(data);
}
