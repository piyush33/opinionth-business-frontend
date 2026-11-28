"use client";

// Client for Ask AI and Converge on the backend (NestJS "think" module).
// Every model call runs there as a background task: start it, then poll, so
// no request outlives the hosting timeout. Identity comes from the login
// token; space work needs access to the space.
import { readAuth } from "@/lib/ai/client";

export type ThinkKind = "chat-card" | "chat-space" | "chat-wide" | "to-card" | "decide" | "call-outcome" | "converge-read";
export type ChatMsg = { role: "user" | "ai"; text: string };

const POLL_MS = 1200;
const MAX_WAIT_MS = 150_000;

// The prompts read at most this much of each card field, so sending more
// only makes requests bigger (the backend accepts up to 1 MB).
const clip = (s: unknown, n: number) => {
  if (typeof s !== "string") return s;
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
};
const slimCards = (cards: unknown) =>
  Array.isArray(cards)
    ? cards.map((c: Record<string, unknown>) => ({
        ...c,
        title: clip(c.title, 220),
        description: clip(c.description, 320),
        text: clip(c.text, 640),
      }))
    : cards;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

async function call(url: string, init: RequestInit | undefined, token: string, signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, signal });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new Error("Couldn't reach the server. Check your connection.");
  }
  const json = await res.json().catch(() => null);
  if (res.status === 401) throw new Error("Session expired. Please sign in again.");
  if (res.status === 403) throw new Error("You don't have access to this space.");
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new Error(msg || "The AI request failed.");
  }
  return json;
}

/** Run an Ask AI / Converge task on the backend and wait for its result. */
export async function askAI<T>(kind: ThinkKind, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { token, orgId } = readAuth();
  if (!token || !orgId) throw new Error("Please sign in again.");
  const base = `/nest-api/orgs/${orgId}/homefeed/think`;
  const payload = { ...body, cards: slimCards(body.cards ?? []), orgCards: slimCards(body.orgCards), refCards: slimCards(body.refCards) };

  const started = await call(
    `${base}/${kind}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    token,
    signal,
  );
  const t0 = Date.now();
  for (;;) {
    await sleep(POLL_MS, signal);
    const view = await call(`${base}/tasks/${started.id}`, undefined, token, signal);
    if (view.status === "done") return view.result as T;
    if (view.status === "error") throw new Error(view.error || "The AI request failed.");
    if (Date.now() - t0 > MAX_WAIT_MS) throw new Error("The AI is taking too long. Try again.");
  }
}

/** Converge state for a space (points, votes, timers) and actions on it. */
export const convergeApi = {
  url(layerId: number, path = "") {
    const { orgId } = readAuth();
    return `/nest-api/orgs/${orgId}/homefeed/layers/${layerId}/converge${path}`;
  },
  async state<T>(layerId: number): Promise<T> {
    const { token } = readAuth();
    if (!token) throw new Error("Please sign in again.");
    return call(this.url(layerId), undefined, token);
  },
  async post<T>(layerId: number, path: "/vote" | "/timer", body: Record<string, unknown>): Promise<T> {
    const { token } = readAuth();
    if (!token) throw new Error("Please sign in again.");
    return call(this.url(layerId, path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, token);
  },
};
