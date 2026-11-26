"use client";

/**
 * Render "@49" card references the way a card does (purple, clickable).
 * `onOpen` decides what a click does: scroll to the card on the same page,
 * or open it.
 */
export function withCardRefs(text: string, onOpen: (id: number) => void) {
  return text.split(/(@\d+\b)/g).map((part, i) => {
    const id = /^@(\d+)$/.exec(part)?.[1];
    if (!id) return <span key={i}>{part}</span>;
    return (
      <button
        key={i}
        type="button"
        className="font-semibold text-[var(--mk-indigo)] hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(Number(id));
        }}
      >
        {part}
      </button>
    );
  });
}
