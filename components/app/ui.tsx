// Shared bitmap-theme building blocks for app pages, matching collabrr.io.
// Tokens live in app/globals.css under `.mk` (applied to <body>).

/** Section label: a square bullet and the 16px pixel face (crisp only at 16px). */
export function PixelLabel({ children, color = "var(--mk-indigo)", className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <p className={`mk-bit flex items-center gap-2 ${className}`} style={{ color }}>
      <span aria-hidden className="inline-block h-2 w-2 shrink-0" style={{ background: color }} />
      {children}
    </p>
  );
}

/** A window: ink outline, 4px printed shadow, and a title bar with three squares. */
export function Window({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mk-hard overflow-hidden rounded-[6px] bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-[var(--mk-ink)] px-3 py-1.5">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 bg-[var(--mk-ink)]" />
          <span className="h-2 w-2 bg-[#868896]" />
          <span className="h-2 w-2 bg-[#c2c4cc]" />
        </span>
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** Class strings for buttons, so plain <button>/<Link> elements can share them. */
export const btn = {
  base: "mk-btn inline-flex items-center justify-center gap-2 rounded-[4px] font-semibold tracking-tight disabled:opacity-60",
  primary: "mk-btn inline-flex items-center justify-center gap-2 rounded-[4px] bg-[var(--mk-indigo)] font-semibold tracking-tight text-white disabled:opacity-60",
  quiet: "mk-btn inline-flex items-center justify-center gap-2 rounded-[4px] bg-[var(--mk-indigo-soft)] font-semibold tracking-tight text-[var(--mk-indigo-deep)] disabled:opacity-60",
  plain: "mk-btn inline-flex items-center justify-center gap-2 rounded-[4px] bg-white font-semibold tracking-tight text-[var(--mk-ink)] disabled:opacity-60",
};

/** Field styling used across forms. */
export const field =
  "w-full rounded-[4px] border border-[var(--mk-ink)] bg-white px-3 py-2.5 text-[15px] tracking-tight text-[var(--mk-ink)] placeholder:text-[#8a8ea0] transition-shadow focus:outline-none focus:shadow-[3px_3px_0_var(--mk-indigo)]";

/** Small tracked caps used for meta labels. */
export const tag = "text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]";
