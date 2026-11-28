"use client";

// "After the call": jot what a 15-minute call settled, and turn it into a card
// for the space, in whichever phase the outcome belongs (the AI chooses).
import { useState } from "react";
import { PenLine, SquarePlus } from "lucide-react";
import { askAI } from "@/lib/ai/think";
import { withCardRefs } from "@/components/ai/cardRefs";
import { getPhaseById } from "@/lib/phases";
import { btn, field, tag } from "@/components/app/ui";
import type { CardSuggestion } from "@/components/ai/CardSuggestionHover";
import type { SummaryCardInput } from "@/components/modals/SpaceSummaryModal";

export default function CallOutcome({
  layerId,
  cards,
  category,
  topic,
  agenda,
  question,
  onJumpToCard,
  onDraft,
}: {
  layerId: number;
  cards: SummaryCardInput[];
  category?: string;
  topic?: string;
  agenda?: { goal: string; items: string[] };
  /** The point the call was about (Converge), if any. */
  question?: string;
  onJumpToCard: (id: number) => void;
  onDraft: (anchorId: number, card: CardSuggestion, phase?: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [card, setCard] = useState<CardSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const refs = (t: string) => withCardRefs(t, onJumpToCard);

  const make = async () => {
    if (!notes.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      setCard(await askAI<CardSuggestion>("call-outcome", { layerId, category, topic, cards, agenda, question, notes }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't turn the notes into a card.");
    } finally {
      setBusy(false);
    }
  };

  const anchor = card ? card.relatedCardIds.find((id) => cards.some((c) => c.id === id)) ?? cards[0]?.id : undefined;

  return (
    <div className="mt-3 border-t border-dashed border-[#b6b8c2] pt-3">
      <p className={tag}>After the call</p>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setCard(null);
        }}
        rows={3}
        placeholder="What did the call settle? Who's doing what? Rough notes are fine."
        className={`${field} mt-1.5 resize-y text-[13.5px]`}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={make} disabled={!notes.trim() || busy} className={`${btn.plain} px-3 py-1.5 text-[13px]`}>
          <SquarePlus className="h-3.5 w-3.5" />
          {busy ? "Shaping a card…" : "Turn into card"}
        </button>
        {err && <span className="text-[12px] text-[var(--mk-amber)]">{err}</span>}
      </div>
      {card && (
        <div className="mt-3 rounded-[4px] border border-[var(--mk-ink)] bg-white p-3 shadow-[2px_2px_0_var(--mk-ink)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em]">
            <span className="text-[var(--mk-indigo)]">{(card.phase && getPhaseById(card.phase)?.name) || "Card"}</span>
            {card.roleTypes.map((r) => (
              <span key={r} className="text-[var(--mk-cyan)]">
                {" · "}
                {r.replace(/-/g, " ")}
              </span>
            ))}
          </p>
          <p className="mt-1 text-[14px] font-bold leading-snug tracking-[-0.02em]">{refs(card.title)}</p>
          {card.description && <p className="mt-1 text-[12.5px] italic leading-snug text-[var(--mk-ink-2)]">{refs(card.description)}</p>}
          {card.text && <p className="mt-1.5 text-[12.5px] leading-snug">{refs(card.text)}</p>}
          {anchor != null && (
            <button onClick={() => onDraft(anchor, card, card.phase)} className={`${btn.quiet} mt-2.5 px-3 py-1.5 text-[13px]`}>
              <PenLine className="h-3.5 w-3.5" /> Draft this card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
