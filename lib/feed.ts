"use client";

// Paged card feed (GET /homefeed/feed). Filters run on the server, so every
// card stays reachable however large the org gets; pages load as the user
// scrolls.

import { useCallback, useEffect, useRef, useState } from "react";
import { readAuth } from "@/lib/ai/client";

export type FeedFilters = {
  category?: string;
  phases?: string[];
  roles?: string[];
  q?: string;
  from?: string; // ISO
  to?: string; // ISO
  content?: string;
  author?: string;
};

type FeedPage<T> = { items: T[]; nextCursor: number | null; total: number | null };

export class SessionExpiredError extends Error {}

const PAGE_SIZE = 30;

const authHeaders = () => {
  const { token, orgId } = readAuth();
  return { orgId, headers: { Authorization: `Bearer ${token}` } };
};

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const { headers } = authHeaders();
  const res = await fetch(url, { headers, signal });
  if (res.status === 401) throw new SessionExpiredError("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const feedUrl = (orgId: number | null, f: FeedFilters, cursor?: number | null) => {
  const p = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) p.set("cursor", String(cursor));
  if (f.category && f.category !== "all") p.set("category", f.category);
  if (f.phases?.length) p.set("phases", f.phases.join(","));
  if (f.roles?.length) p.set("roles", f.roles.join(","));
  if (f.q?.trim()) p.set("q", f.q.trim());
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.content && f.content !== "all") p.set("content", f.content);
  if (f.author) p.set("author", f.author);
  return `/nest-api/orgs/${orgId}/homefeed/feed?${p}`;
};

export type CategoryCount = { id: string; name: string; count: number };

export async function fetchCategoryCounts(signal?: AbortSignal) {
  const { orgId } = authHeaders();
  return getJson<{ total: number; categories: CategoryCount[] }>(
    `/nest-api/orgs/${orgId}/homefeed/feed/categories`,
    signal,
  );
}

/** The feed card behind a profile post (by its profile item id, else by content). */
export async function lookupFeedCard(item: {
  id?: number;
  title?: string;
  description?: string;
  username?: string;
}): Promise<{ id: number; layerId: number | null }> {
  const { orgId } = authHeaders();
  const p = new URLSearchParams();
  if (item.id) p.set("profileItemId", String(item.id));
  if (item.title != null) p.set("title", item.title);
  if (item.description != null) p.set("description", item.description);
  if (item.username) p.set("author", item.username);
  return getJson(`/nest-api/orgs/${orgId}/homefeed/feed/lookup?${p}`);
}

/**
 * Load the feed for `filters` one page at a time. `enabled` holds off until
 * the user is known. Changing the filters starts over from the first page.
 */
export function usePagedFeed<T extends { id: number }>(
  filters: FeedFilters,
  enabled: boolean,
  onSessionExpired?: () => void,
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false); // first page
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const expiredRef = useRef(onSessionExpired);
  expiredRef.current = onSessionExpired;

  const key = JSON.stringify(filters);

  const fail = (e: any) => {
    if (e?.name === "AbortError") return;
    if (e instanceof SessionExpiredError) expiredRef.current?.();
    else setError("Failed to load cards");
  };

  // First page whenever the filters change.
  useEffect(() => {
    if (!enabled) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    setItems([]);
    setTotal(null);
    setHasMore(false);
    getJson<FeedPage<T>>(feedUrl(readAuth().orgId, JSON.parse(key)), ac.signal)
      .then((pg) => {
        setItems(pg.items);
        setTotal(pg.total);
        setCursor(pg.nextCursor);
        setHasMore(pg.nextCursor != null);
      })
      .catch(fail)
      .finally(() => {
        if (abortRef.current === ac) {
          busyRef.current = false;
          setLoading(false);
        }
      });
    return () => ac.abort();
  }, [key, enabled]);

  const loadMore = useCallback(() => {
    if (busyRef.current || !hasMore || cursor == null) return;
    const ac = abortRef.current ?? new AbortController();
    busyRef.current = true;
    setLoadingMore(true);
    getJson<FeedPage<T>>(feedUrl(readAuth().orgId, JSON.parse(key), cursor), ac.signal)
      .then((pg) => {
        if (ac.signal.aborted) return;
        setItems((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          return [...prev, ...pg.items.filter((c) => !seen.has(c.id))];
        });
        setCursor(pg.nextCursor);
        setHasMore(pg.nextCursor != null);
      })
      .catch(fail)
      .finally(() => {
        busyRef.current = false;
        setLoadingMore(false);
      });
  }, [key, cursor, hasMore]);

  return { items, setItems, total, hasMore, loading, loadingMore, error, loadMore };
}

/**
 * Calls `onVisible` while the returned ref's element is near the viewport.
 * `version` (e.g. the item count) re-arms it after each page, so a short
 * page that leaves the sentinel on screen still loads the next one.
 */
export function useLoadMoreSentinel(
  onVisible: () => void,
  active: boolean,
  version: number,
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && cb.current(),
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, version]);
  return ref;
}

/** Debounce a fast-changing value (e.g. search text). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
