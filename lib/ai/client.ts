// Browser-side helpers shared by the AI features.

/** Cheap content signature of a card list: ids + phase + text lengths. */
export const signatureOf = (
  cards: { id: number; phase: string; title?: string; text?: string }[],
) => {
  let h = 0;
  const s = cards
    .map((c) => `${c.id}|${c.phase}|${(c.title ?? "").length}|${(c.text ?? "").length}`)
    .sort()
    .join(",");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `${cards.length}-${Math.abs(h)}`;
};

/** Login token and active org id from localStorage (browser only). */
export const readAuth = (): { token: string | null; orgId: number | null } => {
  try {
    const token = localStorage.getItem("token");
    const org = JSON.parse(localStorage.getItem("activeOrg") || "null");
    const orgId = typeof org === "number" ? org : (org?.id ?? null);
    return { token, orgId };
  } catch {
    return { token: null, orgId: null };
  }
};

/**
 * POST to one of our AI routes. Never throws a raw JSON parse error: a
 * response that isn't JSON (a gateway timeout, a cold start, a dev
 * recompile) is retried once, then reported as a readable message.
 */
export async function postAi<T>(
  url: string,
  body: unknown,
  opts: { signal?: AbortSignal; fallbackError: string },
): Promise<T> {
  const { token } = readAuth();
  const send = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    const raw = await res.text();
    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      /* not JSON */
    }
    return { res, json };
  };

  let { res, json } = await send();
  // Retry once on an unreadable reply or a server/gateway failure; our own
  // 4xx errors (auth, access, bad input) are final.
  if (!json || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1200));
    ({ res, json } = await send());
  }
  if (!json) throw new Error(`${opts.fallbackError} Please try again.`);
  if (!res.ok) throw new Error(json.error || opts.fallbackError);
  return json as T;
}
