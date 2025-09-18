import { LucideIcon } from "lucide-react";
import { JSX } from "react";

// src/lib/customCategories.ts
export type BareCustomCat = { id: string; name?: string };
const COOKIE_NAME = "opinionth.customCategories";
const ONE_YEAR = 60 * 60 * 24 * 365;

// ---- string utils / palette (same logic you already use) ----
export const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const toTitleCase = (id: string) =>
    id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const PALETTE = [
    { color: "text-gray-700", bgColor: "bg-gray-100" },
    { color: "text-emerald-700", bgColor: "bg-emerald-100" },
    { color: "text-blue-700", bgColor: "bg-blue-100" },
    { color: "text-indigo-700", bgColor: "bg-indigo-100" },
    { color: "text-orange-700", bgColor: "bg-orange-100" },
    { color: "text-purple-700", bgColor: "bg-purple-100" },
    { color: "text-pink-700", bgColor: "bg-pink-100" },
    { color: "text-cyan-700", bgColor: "bg-cyan-100" },
    { color: "text-red-700", bgColor: "bg-red-100" },
    { color: "text-amber-700", bgColor: "bg-amber-100" },
    { color: "text-slate-700", bgColor: "bg-slate-100" },
];
const hashCode = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
};
export const paletteFor = (id: string) => PALETTE[hashCode(id) % PALETTE.length];

// ---- cookie helpers (fallback to localStorage) ----
const getCookie = (name: string) =>
    typeof document === "undefined"
        ? null
        : document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1] ?? null;

const setCookie = (name: string, value: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${value}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax`;
};

const readRawList = (): BareCustomCat[] => {
    try {
        const c = getCookie(COOKIE_NAME);
        if (c) return JSON.parse(decodeURIComponent(c));
        // fallback
        const ls = typeof window !== "undefined" ? window.localStorage.getItem(COOKIE_NAME) : null;
        return ls ? JSON.parse(ls) : [];
    } catch { return []; }
};

const writeRawList = (list: BareCustomCat[]) => {
    try {
        const val = encodeURIComponent(JSON.stringify(list.slice(0, 100))); // safety cap
        setCookie(COOKIE_NAME, val);
        if (typeof window !== "undefined") window.localStorage.setItem(COOKIE_NAME, JSON.stringify(list));
    } catch { /* ignore */ }
};

// ---- public API ----
export const getSavedCustomCats = (): BareCustomCat[] => readRawList();

export const upsertSavedCustomCat = (id: string, name?: string) => {
    const list = readRawList();
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) list[idx] = { id, name: name || list[idx].name };
    else list.push({ id, name });
    writeRawList(list);
};

export const ensureSaved = (ids: string[]) => {
    // optional helper to store ones you “discover” elsewhere
    const list = readRawList();
    const set = new Set(list.map((c) => c.id));
    let changed = false;
    ids.forEach((id) => { if (!set.has(id)) { list.push({ id }); changed = true; } });
    if (changed) writeRawList(list);
};

// Hydrate into UI Category objects (page chooses the icon)
export const hydrateForUI = (
    bare: BareCustomCat[],
    Icon: LucideIcon
) => {
    return bare.map(({ id, name }) => {
        const p = paletteFor(id);
        return {
            id,
            name: name || toTitleCase(id),
            icon: Icon,                 // ⬅️ stays a Lucide component
            color: p.color,
            bgColor: p.bgColor,
            description: "Custom category",
            isCustom: true,
            count: 0,
        };
    });
};
