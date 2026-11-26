// src/components/modals/LayerLockModal.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Check, Lock } from "lucide-react";
import { OrgApi } from "@/utils/api";
import { Window, btn, field } from "@/components/app/ui";

type Person = { id: number; username: string; name?: string; image?: string };

export default function LayerLockModal({
  orgId,
  currentUserId,
  initialSelected = [],
  onClose,
  onSave,
}: {
  orgId: number;
  currentUserId: number; // <-- NEW: who is "me"
  initialSelected?: number[];
  onClose: () => void;
  onSave: (ids: number[]) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initialSelected)
  );

  // mode: "private" => only me; "members" => pick specific members
  const initialMode: "private" | "members" =
    initialSelected.length === 1 && initialSelected[0] === currentUserId
      ? "private"
      : "members";
  const [mode, setMode] = useState<"private" | "members">(initialMode);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const { data } = await OrgApi.searchMembers(orgId, q);
        setPeople(data as Person[]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orgId, q]);

  const toggle = (id: number) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Ensure we show "you" label in the list
  const peopleWithYou = useMemo(() => {
    return people.map((p) =>
      p.id === currentUserId
        ? { ...p, name: p.name || `${p.username} (you)` }
        : p
    );
  }, [people, currentUserId]);

  const handleSave = () => {
    if (mode === "private") {
      onSave([currentUserId]);
      return;
    }
    // Specific members: always include me at minimum
    const ids = new Set(selected);
    ids.add(currentUserId);
    onSave(Array.from(ids));
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[var(--mk-ink)]/40" onClick={onClose} />
      <Window
        title="space://lock"
        className="absolute inset-x-4 top-16 bottom-16 flex flex-col md:inset-x-1/3"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--mk-rule)] p-4 text-[var(--mk-ink)]">
          <div className="flex items-center gap-2 text-[18px] font-bold tracking-[-0.03em]">
            <Lock className="h-4 w-4" />
            Lock layer
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-4">
          <div className="inline-flex gap-1 rounded-[4px] border border-[var(--mk-ink)] bg-white p-1">
            <button
              onClick={() => setMode("private")}
              className={`rounded-[4px] px-3 py-1.5 text-[13.5px] font-semibold tracking-tight ${
                mode === "private"
                  ? "bg-[var(--mk-ink)] text-white"
                  : "text-[var(--mk-ink-2)] hover:bg-[var(--mk-indigo-soft)]"
              }`}
            >
              Only me (private)
            </button>
            <button
              onClick={() => setMode("members")}
              className={`rounded-[4px] px-3 py-1.5 text-[13.5px] font-semibold tracking-tight ${
                mode === "members"
                  ? "bg-[var(--mk-ink)] text-white"
                  : "text-[var(--mk-ink-2)] hover:bg-[var(--mk-indigo-soft)]"
              }`}
            >
              Specific members
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--mk-rule)] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]" />
            <input
              className={`${field} pl-9 disabled:bg-[var(--mk-paper)] disabled:text-[var(--mk-ink-2)]`}
              placeholder={
                mode === "private"
                  ? "Member search disabled for private"
                  : "Search people in this workspace…"
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={mode === "private"}
            />
          </div>
          {mode === "private" && (
            <div className="mt-2 text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
              Only you will be able to view and add cards in this layer.
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="min-h-0 flex-1 overflow-auto">
          {mode === "private" ? (
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
                  {/* We don’t have the current user's avatar here; keep it simple */}
                  <span className="text-[11px] font-semibold text-[var(--mk-ink)]">You</span>
                </div>
                <div>
                  <div className="font-semibold tracking-tight text-[var(--mk-ink)]">Only you</div>
                  <div className="text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
                    The layer will be locked to just your account.
                  </div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="p-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">Loading…</div>
          ) : peopleWithYou.length ? (
            peopleWithYou.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex w-full items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3 text-left ${
                  selected.has(p.id)
                    ? "bg-[var(--mk-indigo-soft)]"
                    : "hover:bg-[var(--mk-paper)]"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold text-[var(--mk-ink)]">
                      {p.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold tracking-tight text-[var(--mk-ink)]">
                    {p.name || p.username}
                  </div>
                  <div className="text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">@{p.username}</div>
                </div>
                {selected.has(p.id) && (
                  <Check className="h-4 w-4 text-[var(--mk-indigo)]" />
                )}
              </button>
            ))
          ) : (
            <div className="p-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">No members found.</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--mk-ink)] p-4">
          <button onClick={onClose} className={`${btn.plain} px-4 py-2 text-[14px]`}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`${btn.primary} px-4 py-2 text-[14px]`}
          >
            Save & lock
          </button>
        </div>
      </Window>
    </div>
  );
}
