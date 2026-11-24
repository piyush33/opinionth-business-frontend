// Shared server-side helpers for the AI routes (space summary, card
// suggestions). Server-only: imports node crypto and reads the Gemini key.
import { createHash } from "crypto";

export type InCard = {
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

export type SpaceBody = {
  layerId?: number;
  orgId?: number | string;
  category?: string;
  phases: string[]; // ordered phase labels that have cards
  cards: InCard[];
  force?: boolean;
};

export type Fail = { ok: false; status: number; error: string };

export const MAX_CARDS = 200;
const MAX_FIELD = 700;

// Backend that owns auth and layer membership (same target as the
// /nest-api rewrite in next.config.ts).
const NEST_API_ORIGIN =
  process.env.NEST_API_ORIGIN || "https://dn2h1x2q2afc3.cloudfront.net";

export const clip = (s: unknown, n = MAX_FIELD) => {
  const str = typeof s === "string" ? s : "";
  const flat = str.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
};

/** Compact card form sent to the model (and hashed into signatures). */
export const compactCards = (cards: InCard[]) =>
  cards.map((c) => ({
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

export type CompactCard = ReturnType<typeof compactCards>[number];

export const sha256 = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");

export const geminiConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
});

export type Space = { token: string; orgId: string; layerId: string };

/** Pull the caller's token and the space ids out of the request. */
export function readSpace(
  req: Request,
  body: Pick<SpaceBody, "orgId" | "layerId">,
): { ok: true; space: Space } | Fail {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return { ok: false, status: 401, error: "Sign in to use this." };
  const orgId = String(body.orgId ?? "");
  const layerId = String(body.layerId ?? "");
  if (!/^\d+$/.test(orgId) || !/^\d+$/.test(layerId)) {
    return { ok: false, status: 400, error: "Missing space details." };
  }
  return { ok: true, space: { token, orgId, layerId } };
}

const savedUrl = (s: Space, signature?: string) =>
  `${NEST_API_ORIGIN}/orgs/${s.orgId}/homefeed/layers/${s.layerId}/summary` +
  (signature ? `?signature=${signature}` : "");

/**
 * Look up a saved AI result for this space and signature. This is also
 * the access check: the backend takes the user from the token and applies
 * the same rules as reading the layer's cards. Any AI output (summary,
 * suggestions) is stored here; distinct signatures keep them apart.
 */
export async function loadSaved<T>(
  s: Space,
  signature: string,
): Promise<{ ok: true; value: T | null } | Fail> {
  let res: Response;
  try {
    res = await fetch(savedUrl(s, signature), {
      headers: { Authorization: `Bearer ${s.token}` },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[ai] backend unreachable", e);
    return { ok: false, status: 502, error: "Could not verify access." };
  }
  if (res.status === 401)
    return { ok: false, status: 401, error: "Session expired. Please sign in again." };
  if (res.status === 403)
    return { ok: false, status: 403, error: "You don't have access to this space." };
  if (!res.ok) {
    console.error("[ai] backend lookup failed", res.status);
    return { ok: false, status: 502, error: "Could not verify access." };
  }
  const json = await res.json().catch(() => null);
  return { ok: true, value: (json?.summary as T) ?? null };
}

/** Save a fresh result so the next viewer of these cards gets it free. */
export async function saveResult(
  s: Space,
  signature: string,
  model: string,
  value: object,
) {
  try {
    const res = await fetch(savedUrl(s), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${s.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ signature, model, summary: value }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[ai] save failed", res.status);
  } catch (e) {
    console.error("[ai] save failed", e);
  }
}

/** One structured-JSON Gemini call. */
export async function geminiJson<T>(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  schema: object;
  temperature?: number;
  /** Gemini 2.5 "thinking" tokens; 0 turns it off (much faster). */
  thinkingBudget?: number;
  tag: string;
}): Promise<{ ok: true; value: T } | Fail> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        opts.model,
      )}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            responseMimeType: "application/json",
            responseSchema: opts.schema,
            ...(opts.thinkingBudget !== undefined && {
              thinkingConfig: { thinkingBudget: opts.thinkingBudget },
            }),
          },
        }),
      },
    );
  } catch (e) {
    console.error(`[${opts.tag}] network error`, e);
    return { ok: false, status: 502, error: "Could not reach the AI service." };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[${opts.tag}] gemini error`, res.status, detail.slice(0, 500));
    return { ok: false, status: 502, error: `AI service error (${res.status}).` };
  }
  const json = await res.json().catch(() => null);
  const raw: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!raw) return { ok: false, status: 502, error: "AI returned an empty response." };
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, status: 502, error: "AI returned malformed output." };
  }
}
