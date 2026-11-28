"use client";

// Convergence timers: a countdown anyone can set, pause, resume or clear on a
// point. `useNow` ticks once a second for live countdowns.
import { useEffect, useState } from "react";
import { Timer as TimerIcon, Pause, Play, X } from "lucide-react";
import { timeLeft, type ConvergeTimer } from "@/lib/ai/useConvergence";
import { btn } from "@/components/app/ui";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/** "2d 4h", "5h 12m", "12m 30s", "Time's up". */
export function formatLeft(ms: number) {
  if (ms <= 0) return "Time's up";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

const H = 3_600_000;
const PRESETS: [string, number][] = [
  ["1h", H],
  ["4h", 4 * H],
  ["12h", 12 * H],
  ["24h", 24 * H],
  ["2 days", 48 * H],
  ["3 days", 72 * H],
  ["4 days", 96 * H],
  ["5 days", 120 * H],
];

/** The timer row on a point in the Converge panel. */
export function TimerControl({
  timer,
  onTimer,
}: {
  timer?: ConvergeTimer;
  onTimer: (op: "set" | "pause" | "resume" | "clear", durationMs?: number) => void;
}) {
  const now = useNow();
  const [picking, setPicking] = useState(false);

  if (!timer) {
    return picking ? (
      <div className="rounded-[4px] border border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--mk-indigo-deep)]">
          <TimerIcon className="h-4 w-4" /> Converge within…
          <button onClick={() => setPicking(false)} className="ml-auto grid h-6 w-6 place-items-center rounded-[3px] text-[var(--mk-ink-2)] hover:bg-white hover:text-[var(--mk-ink)]" aria-label="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(([label, ms]) => (
            <button
              key={label}
              onClick={() => {
                onTimer("set", ms);
                setPicking(false);
              }}
              className="mk-btn rounded-[4px] bg-white px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-[var(--mk-ink)]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <button onClick={() => setPicking(true)} className={`${btn.plain} px-3 py-1.5 text-[13px]`} title="Give this point a deadline to converge by">
        <TimerIcon className="h-4 w-4 text-[var(--mk-indigo)]" /> Set a timer
      </button>
    );
  }

  const left = timeLeft(timer, now);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <span
        className={`inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5 font-semibold tabular-nums ${
          left === 0
            ? "border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] text-[var(--mk-amber)]"
            : "border-[var(--mk-ink)] bg-white text-[var(--mk-ink)]"
        }`}
      >
        <TimerIcon className="h-3.5 w-3.5" />
        {formatLeft(left)}
        {!timer.running && left > 0 && <span className="font-normal text-[var(--mk-ink-2)]">· paused</span>}
      </span>
      {left > 0 &&
        (timer.running ? (
          <button onClick={() => onTimer("pause")} className="inline-flex items-center gap-1 font-semibold text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]">
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
        ) : (
          <button onClick={() => onTimer("resume")} className="inline-flex items-center gap-1 font-semibold text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]">
            <Play className="h-3.5 w-3.5" /> Resume
          </button>
        ))}
      <button onClick={() => onTimer("clear")} className="font-semibold text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]">
        Clear
      </button>
    </div>
  );
}
