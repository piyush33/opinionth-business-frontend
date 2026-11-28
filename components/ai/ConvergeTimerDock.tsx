"use client";

// Floating convergence timers, above "Add a card": points with under 24h
// left (and not yet converged), most urgent first. Click cycles to the next;
// hover or focus grows it to show the question with Pause/Resume and a way
// into Converge.
import { useState } from "react";
import { Timer as TimerIcon, Pause, Play, ArrowUpRight } from "lucide-react";
import { ACROSS, timeLeft, type ConvergePoint, type ConvergeTimer } from "@/lib/ai/useConvergence";
import { formatLeft, useNow } from "@/components/ai/ConvergeTimer";

const DAY = 24 * 3_600_000;

export default function ConvergeTimerDock({
  items,
  onOpen,
  onTimer,
}: {
  items: { point: ConvergePoint; timer: ConvergeTimer }[];
  onOpen: (point: ConvergePoint) => void;
  onTimer: (pointId: string, op: "pause" | "resume") => void;
}) {
  const now = useNow();
  const [pick, setPick] = useState(0);
  const [big, setBig] = useState(false);

  const due = items
    .map((it) => ({ ...it, left: timeLeft(it.timer, now) }))
    .filter((it) => it.left < DAY)
    .sort((a, b) => a.left - b.left);
  if (!due.length) return null;

  const cur = due[pick % due.length];
  const up = cur.left === 0;
  const next = () => setPick((p) => (p + 1) % due.length);

  return (
    <div
      className="fixed bottom-[5.25rem] right-6 z-30 flex justify-end"
      onMouseEnter={() => setBig(true)}
      onMouseLeave={() => setBig(false)}
      onFocus={() => setBig(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setBig(false)}
    >
      <div
        className={`mk-hard overflow-hidden rounded-[6px] bg-white transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          big ? "w-[20rem]" : "w-[15rem]"
        } ${up ? "border-[var(--mk-amber)]" : ""}`}
      >
        {/* The whole card cycles to the next timer */}
        <button
          type="button"
          onClick={next}
          className="block w-full px-3 py-2.5 text-left"
          aria-label={`Convergence timer ${(pick % due.length) + 1} of ${due.length}: ${cur.point.question}. ${formatLeft(cur.left)}. Click for the next.`}
        >
          <span className="flex items-center gap-2">
            <TimerIcon className={`h-4 w-4 shrink-0 ${up ? "text-[var(--mk-amber)]" : "text-[var(--mk-indigo)]"}`} />
            <span className={`text-[14px] font-bold tabular-nums tracking-tight ${up ? "text-[var(--mk-amber)]" : ""}`}>{formatLeft(cur.left)}</span>
            {!cur.timer.running && !up && <span className="text-[11px] text-[var(--mk-ink-2)]">paused</span>}
            {due.length > 1 && (
              <span className="ml-auto text-[11px] font-semibold tabular-nums text-[var(--mk-ink-2)]">
                {(pick % due.length) + 1}/{due.length}
              </span>
            )}
          </span>
          {big ? (
            <>
              <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">
                Converge · {cur.point.phase === ACROSS ? "Across phases" : cur.point.phase}
              </span>
              <span className="mt-0.5 block text-[13.5px] font-semibold leading-snug tracking-[-0.01em]">{cur.point.question}</span>
              {due.length > 1 && <span className="mt-1 block text-[11px] text-[var(--mk-ink-2)]">Click for the next timer</span>}
            </>
          ) : (
            <span className="mt-0.5 block truncate text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">{cur.point.question}</span>
          )}
        </button>
        {big && (
          <div className="flex items-center gap-3 border-t border-[var(--mk-rule)] px-3 py-2 text-[12.5px]">
            {!up &&
              (cur.timer.running ? (
                <button onClick={() => onTimer(cur.point.id, "pause")} className="inline-flex items-center gap-1 font-semibold text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]">
                  <Pause className="h-3.5 w-3.5" /> Pause
                </button>
              ) : (
                <button onClick={() => onTimer(cur.point.id, "resume")} className="inline-flex items-center gap-1 font-semibold text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]">
                  <Play className="h-3.5 w-3.5" /> Resume
                </button>
              ))}
            <button onClick={() => onOpen(cur.point)} className="ml-auto inline-flex items-center gap-1 font-semibold text-[var(--mk-indigo)] hover:underline">
              Open in Converge <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
