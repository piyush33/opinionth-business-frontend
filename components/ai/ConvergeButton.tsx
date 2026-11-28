"use client";

// The Converge action: shown only where there's something to converge on
// (the space header, a phase heading, a phase in the summary), with the
// number of open points.
import { GitMerge } from "lucide-react";
import { btn } from "@/components/app/ui";

export default function ConvergeButton({
  count,
  onClick,
  className = "",
}: {
  count: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${btn.plain} ${className}`}
      title={`${count} ${count === 1 ? "point" : "points"} to converge on`}
    >
      <GitMerge className="h-3.5 w-3.5 text-[var(--mk-indigo)]" />
      Converge
      <span className="tabular-nums text-[var(--mk-indigo)]">{count}</span>
    </button>
  );
}
