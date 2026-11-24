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
