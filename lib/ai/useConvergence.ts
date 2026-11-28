"use client";

// Converge, shared by the space header, each phase and the summary: the open
// points the AI found in a space (each tagged with its phase), the votes on
// their positions, and who may vote. A position converges once more than half
// of the people who contributed to that phase back it ("Across phases"
// points: everyone who contributed to the space).
//
// State lives on the backend (think module): the open points of the latest
// reading, one vote per person per point (from the login), and timers. The
// server decides which points are locked (a vote or a timer) and keeps them
// through re-reads until they converge.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { askAI, convergeApi } from "@/lib/ai/think";
import type { SummaryCardInput } from "@/components/modals/SpaceSummaryModal";

export const ACROSS = "Across phases";

export type ConvergePosition = { stance: string; summary: string; cardIds: number[] };
export type ConvergePoint = {
  id: string;
  phase: string;
  question: string;
  status: "split" | "leaning" | "open";
  positions: ConvergePosition[];
  missing: string;
  leaning: string;
};
export type ConvergeTimer = { deadline: number | null; remaining: number | null; running: boolean; setBy: string };
type State = {
  analysis: { points: ConvergePoint[]; generatedAt: string; signature: string } | null;
  votes: Record<string, Record<string, number>>;
  timers?: Record<string, ConvergeTimer>;
};

/** Time left on a timer, in ms (0 when it's up). */
export const timeLeft = (t: ConvergeTimer, now = Date.now()) =>
  Math.max(0, t.running && t.deadline ? t.deadline - now : t.remaining ?? 0);

const POLL_MS = 8000;
const MIN_CARDS = 3;

// Changes when cards are added or removed, so a stale reading can be flagged.
const signatureOf = (cards: SummaryCardInput[]) => cards.map((c) => c.id).sort((a, b) => a - b).join(",");

export function useConvergence({
  layerId,
  cards,
  phases,
  category,
  topic,
  username,
}: {
  layerId: number | null | undefined;
  cards: SummaryCardInput[];
  phases: string[];
  category?: string;
  topic?: string;
  username?: string;
}) {
  const [state, setState] = useState<State>({ analysis: null, votes: {} });
  const [loaded, setLoaded] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef<string | null>(null);
  const tallyRef = useRef<((p: ConvergePoint) => { winner: number | null }) | null>(null);

  const fetchState = useCallback(async () => {
    if (!layerId) return;
    try {
      setState(await convergeApi.state<State>(layerId));
    } catch {
      /* keep what we have; the next poll retries */
    }
    setLoaded(true);
  }, [layerId]);

  /** Read the space. "update" keeps points still open (and their votes) and
   *  drops the ones new cards settled; "fresh" starts over. */
  const analyse = useCallback(async (mode: "fresh" | "update" = "fresh") => {
    if (!layerId || analysing) return;
    setAnalysing(true);
    setError(null);
    try {
      // Points that have converged may leave once a reading finds them
      // settled; the server works out which points are locked.
      const all = state.analysis?.points ?? [];
      const convergedIds = all.filter((p) => tallyRef.current?.(p).winner != null).map((p) => p.id);
      const next = await askAI<State>("converge-read", {
        layerId,
        mode,
        category,
        topic,
        cards,
        phases,
        signature: signatureOf(cards),
        convergedIds,
      });
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the space.");
    } finally {
      setAnalysing(false);
    }
  }, [layerId, analysing, category, topic, cards, phases, state.analysis]);

  /** Set (durationMs), pause, resume or clear a point's timer. Anyone can. */
  const timer = useCallback(
    async (pointId: string, op: "set" | "pause" | "resume" | "clear", durationMs?: number) => {
      if (!layerId) return;
      try {
        setState(await convergeApi.post<State>(layerId, "/timer", { pointId, op, durationMs }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't update the timer.");
      }
    },
    [layerId],
  );

  const vote = useCallback(
    async (pointId: string, position: number | null) => {
      if (!layerId || !username) return;
      // Optimistic, then the shared truth.
      setState((s) => {
        const forPoint = { ...(s.votes[pointId] ?? {}) };
        if (position === null) delete forPoint[username];
        else forPoint[username] = position;
        return { ...s, votes: { ...s.votes, [pointId]: forPoint } };
      });
      try {
        setState(await convergeApi.post<State>(layerId, "/vote", { pointId, position }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save your vote.");
        fetchState();
      }
    },
    [layerId, username, fetchState],
  );

  // Load, keep votes in sync, and read the space once if it has never been read.
  useEffect(() => {
    setLoaded(false);
    fetchState();
    const t = window.setInterval(fetchState, POLL_MS);
    return () => window.clearInterval(t);
  }, [fetchState]);

  // Read the space the first time, and again whenever its cards change (so a
  // posted convergence card settles its point). One run per card signature.
  const signature = signatureOf(cards);
  useEffect(() => {
    if (!loaded || !layerId || cards.length < MIN_CARDS || analysing) return;
    if (state.analysis?.signature === signature) return;
    const key = `${layerId}:${signature}`;
    if (autoRan.current === key) return;
    autoRan.current = key;
    analyse(state.analysis ? "update" : "fresh");
  }, [loaded, layerId, cards.length, analysing, state.analysis, signature, analyse]);

  // Who contributed where: they are the voters for that phase's points.
  const participants = useMemo(() => {
    const byPhase = new Map<string, Set<string>>();
    const all = new Set<string>();
    for (const c of cards) {
      if (!c.username) continue;
      all.add(c.username);
      if (!byPhase.has(c.phase)) byPhase.set(c.phase, new Set());
      byPhase.get(c.phase)!.add(c.username);
    }
    return { byPhase, all };
  }, [cards]);

  const eligibleFor = useCallback(
    (point: ConvergePoint) => (point.phase !== ACROSS && participants.byPhase.get(point.phase)) || participants.all,
    [participants],
  );

  /** Votes per position (eligible voters only), and whether one has a majority. */
  const tallyOf = useCallback(
    (point: ConvergePoint) => {
      const eligible = eligibleFor(point);
      const votes = state.votes[point.id] ?? {};
      const voters = point.positions.map((_, i) => Object.entries(votes).filter(([u, p]) => p === i && eligible.has(u)).map(([u]) => u));
      const counts = voters.map((v) => v.length);
      const need = Math.floor(eligible.size / 2) + 1; // more than half
      const winner = counts.findIndex((n) => n >= need);
      return {
        eligible,
        voters,
        counts,
        need,
        voted: counts.reduce((a, b) => a + b, 0),
        winner: winner >= 0 ? winner : null,
        mine: username != null && votes[username] !== undefined ? votes[username] : null,
        canVote: !!username && eligible.has(username),
      };
    },
    [eligibleFor, state.votes, username],
  );

  tallyRef.current = tallyOf;

  const points = useMemo(() => state.analysis?.points ?? [], [state.analysis]);
  const countByPhase = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.phase, (m.get(p.phase) ?? 0) + 1);
    return m;
  }, [points]);

  const timers = useMemo(() => state.timers ?? {}, [state.timers]);

  return {
    layerId: layerId ?? null,
    points,
    timers,
    timer,
    countByPhase,
    generatedAt: state.analysis?.generatedAt ?? null,
    stale: !!state.analysis && state.analysis.signature !== signatureOf(cards),
    analysing,
    error,
    analyse,
    vote,
    tallyOf,
  };
}

export type Convergence = ReturnType<typeof useConvergence>;
