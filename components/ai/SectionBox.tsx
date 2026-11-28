"use client";

// One of the two boxes inside a suggestion panel: the suggestion itself
// (card, summary, idea) with its actions, or the Ask AI chat with its input.
// Each has a header bar that expands or collapses it, so the two stay
// separate and you can move between them in one click.
import { ChevronDown } from "lucide-react";

export default function SectionBox({
  label,
  icon,
  hint,
  open,
  onToggle,
  children,
  footer,
  footerWhenClosed = false,
  scroll = true,
  sticky = false,
  className = "",
  bodyClassName = "",
  containScroll = true,
}: {
  label: string;
  icon?: React.ReactNode;
  /** Shown in the header bar while collapsed (a title, "4 messages"…). */
  hint?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  /** Actions (Draft…) or the chat input, under the content. */
  footer?: React.ReactNode;
  /** Keep the footer visible while collapsed (the chat input). */
  footerWhenClosed?: boolean;
  /** Scroll the content inside the box (panels with a fixed height). */
  scroll?: boolean;
  /** Stick the footer to the bottom of the screen (inline panels). */
  sticky?: boolean;
  className?: string;
  /** Extra classes for the content area (e.g. a max height). */
  bodyClassName?: string;
  /** Stop scrolling at the box's edge (floating panels). Inline panels pass
   *  false, so reaching the end of the box carries on scrolling the page. */
  containScroll?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-[5px] border border-[var(--mk-ink)] bg-white ${
        open ? "flex-1 shadow-[2px_2px_0_var(--mk-ink)]" : "shrink-0"
      } ${sticky ? "" : "overflow-hidden"} ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex shrink-0 items-center gap-2 rounded-t-[5px] px-3 py-2 text-left transition-colors hover:bg-[var(--mk-indigo-soft)]"
      >
        {icon}
        <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">{label}</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">{!open && hint}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--mk-ink-2)] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children && (
        <div className={`ai-fade-in min-h-0 flex-1 border-t border-[var(--mk-rule)] ${scroll ? `overflow-y-auto ${containScroll ? "overscroll-contain" : ""}` : ""} ${bodyClassName}`}>
          {children}
        </div>
      )}
      {footer && (open || footerWhenClosed) && (
        <div
          className={`shrink-0 border-t border-[var(--mk-rule)] ${
            sticky ? "sticky bottom-0 z-10 rounded-b-[5px] bg-white" : ""
          }`}
        >
          {footer}
        </div>
      )}
    </section>
  );
}
