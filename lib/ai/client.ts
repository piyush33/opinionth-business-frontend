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

type JobView =
  | { status: "done"; signature: string; result: unknown }
  | { status: "pending" | "missing"; signature: string }
  | { status: "error"; signature: string; error: string };

const POLL_MS = 2000;
const MAX_WAIT_MS = 90_000;
// Above the server's 700-character clip, so clipping here never changes
// what the model sees (or the signature); it just keeps payloads small.
const SEND_CLIP = 1000;

const preclip = (s?: string) => {
  if (typeof s !== "string") return s;
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > SEND_CLIP ? `${flat.slice(0, SEND_CLIP)}…` : flat;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/**
 * Start (or join) a backend AI job, then poll until it's done. Generation
 * happens in the background there, so no single request runs long enough
 * to hit the hosting timeout.
 */
async function runJob<T>(
  base: string,
  body: unknown,
  opts: {
    signal?: AbortSignal;
    fallbackError: string;
    token: string;
    /** Extra query params for the status poll. */
    pollQuery?: Record<string, string>;
    forbidden?: string;
  },
): Promise<T> {
  const headers = { Authorization: `Bearer ${opts.token}` };

  const call = async (init?: RequestInit, url = base): Promise<JobView> => {
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers: { ...headers, ...init?.headers }, signal: opts.signal });
    } catch (e: any) {
      if (e?.name === "AbortError") throw e;
      throw new Error(`${opts.fallbackError} Check your connection.`);
    }
    const json: any = await res.json().catch(() => null);
    if (res.status === 401) throw new Error("Session expired. Please sign in again.");
    if (res.status === 403) throw new Error(opts.forbidden ?? "You don't have access to this space.");
    if (!res.ok || !json?.status) {
      const msg = Array.isArray(json?.message) ? json.message[0] : json?.message;
      throw new Error(msg || opts.fallbackError);
    }
    return json as JobView;
  };

  let view = await call({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const started = Date.now();
  while (view.status === "pending") {
    if (Date.now() - started > MAX_WAIT_MS)
      throw new Error(`${opts.fallbackError} It is taking too long; try again.`);
    await sleep(POLL_MS, opts.signal);
    const q = new URLSearchParams({ ...opts.pollQuery, signature: view.signature });
    view = await call(undefined, `${base}?${q}`);
  }
  if (view.status === "done") return view.result as T;
  if (view.status === "error") throw new Error(view.error || opts.fallbackError);
  throw new Error(opts.fallbackError); // "missing": the job vanished
}

/** Summary or card suggestions for one space. */
export async function runAiJob<T>(
  kind: "summary" | "suggestions",
  input: {
    layerId: number;
    category: string;
    phases: string[];
    cards: { id: number; title?: string; description?: string; text?: string }[];
    force?: boolean;
  },
  opts: { signal?: AbortSignal; fallbackError: string },
): Promise<T> {
  const { token, orgId } = readAuth();
  if (!token || orgId == null) throw new Error("Sign in to use this.");
  return runJob<T>(
    `/nest-api/orgs/${orgId}/homefeed/layers/${input.layerId}/ai/${kind}`,
    {
      category: input.category,
      phases: input.phases,
      force: !!input.force,
      cards: input.cards.map((c) => ({
        ...c,
        title: preclip(c.title),
        description: preclip(c.description),
        text: preclip(c.text),
      })),
    },
    { ...opts, token },
  );
}

/**
 * New-space ideas for an Explore category. The backend reads every space
 * the user can see itself, so only the category goes up.
 */
export async function runSpaceIdeas<T>(
  input: { category: string; categoryName: string; categoryDescription?: string; force?: boolean },
  opts: { signal?: AbortSignal; fallbackError: string },
): Promise<T> {
  const { token, orgId } = readAuth();
  if (!token || orgId == null) throw new Error("Sign in to use this.");
  return runJob<T>(`/nest-api/orgs/${orgId}/homefeed/ai/space-ideas`, input, {
    ...opts,
    token,
    pollQuery: { category: input.category },
    forbidden: "You don't have access to this organization.",
  });
}
