"use client";

// Cards across every space the viewer can see, for Ask AI's "All spaces"
// scope: the newest cards from the paged feed (the server applies visibility).
// Cached for a few minutes so switching scope doesn't refetch.
import { readAuth } from "@/lib/ai/client";

export type OrgCard = {
  id: number;
  title?: string;
  description?: string;
  text?: string;
  username?: string;
  phase?: string;
  category?: string;
};

const MAX = 200;
const TTL = 5 * 60_000;
let cache: { at: number; orgId: number | null; cards: OrgCard[] } | null = null;

export async function fetchOrgCards(signal?: AbortSignal): Promise<OrgCard[]> {
  const { token, orgId } = readAuth();
  if (cache && cache.orgId === orgId && Date.now() - cache.at < TTL) return cache.cards;
  const cards: OrgCard[] = [];
  let cursor: number | null = null;
  do {
    const p = new URLSearchParams({ limit: "50" });
    if (cursor) p.set("cursor", String(cursor));
    const res = await fetch(`/nest-api/orgs/${orgId}/homefeed/feed?${p}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) throw new Error(`Couldn't load the workspace's cards (${res.status}).`);
    const page: { items: OrgCard[]; nextCursor: number | null } = await res.json();
    for (const c of page.items)
      cards.push({ id: c.id, title: c.title, description: c.description, text: c.text, username: c.username, phase: c.phase, category: c.category });
    cursor = page.nextCursor;
  } while (cursor && cards.length < MAX);
  cache = { at: Date.now(), orgId, cards: cards.slice(0, MAX) };
  return cache.cards;
}

// Cards mentioned in a chat by @id, from any space the viewer can see, so the
// AI knows what "@70" says whatever the scope. Cached per card id.
export type RefCard = OrgCard & { spaceId?: number | null };
const byId = new Map<number, RefCard | null>();

export const mentionedIds = (texts: string[]) => [
  ...new Set(texts.flatMap((t) => [...t.matchAll(/@(\d+)\b/g)].map((m) => Number(m[1])))),
];

export async function fetchCardsByIds(ids: number[], signal?: AbortSignal): Promise<RefCard[]> {
  const { token, orgId } = readAuth();
  let username = "";
  try {
    // The signed-in user is stored as "authUser" (older flows used "user").
    username = JSON.parse(localStorage.getItem("authUser") || localStorage.getItem("user") || "{}")?.username ?? "";
  } catch {
    /* no user */
  }
  const want = ids.filter((id) => !byId.has(id)).slice(0, 12);
  await Promise.all(
    want.map(async (id) => {
      try {
        const res = await fetch(`/nest-api/orgs/${orgId}/homefeed/item/${id}/user/${encodeURIComponent(username)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) return void byId.set(id, null);
        const c = await res.json();
        byId.set(id, c?.id
          ? { id: c.id, title: c.title, description: c.description, text: c.text, username: c.username, phase: c.phase, category: c.category, spaceId: c.layer?.id ?? null }
          : null);
      } catch {
        /* leave uncached; try again next message */
      }
    }),
  );
  return ids.map((id) => byId.get(id)).filter((c): c is RefCard => !!c);
}
