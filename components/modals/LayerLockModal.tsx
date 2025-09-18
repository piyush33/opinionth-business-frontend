// src/components/modals/LayerLockModal.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Check, Lock } from "lucide-react";
import { OrgApi } from "@/utils/api";

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-4 top-16 bottom-16 md:inset-x-1/3 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between text-gray-900">
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Lock layer
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-900"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-4">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setMode("private")}
              className={`px-3 py-2 text-sm ${
                mode === "private"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Only me (private)
            </button>
            <button
              onClick={() => setMode("members")}
              className={`px-3 py-2 text-sm border-l border-gray-200 ${
                mode === "members"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Specific members
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b text-gray-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className="w-full pl-9 pr-3 py-2 border rounded-lg disabled:bg-gray-100 disabled:text-gray-500"
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
            <div className="mt-2 text-xs text-gray-500">
              Only you will be able to view and add cards in this layer.
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-auto">
          {mode === "private" ? (
            <div className="p-4 text-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                  {/* We don’t have the current user's avatar here; keep it simple */}
                  <span className="text-xs text-gray-900">You</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Only you</div>
                  <div className="text-xs text-gray-500">
                    The layer will be locked to just your account.
                  </div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="p-4 text-gray-500">Loading…</div>
          ) : peopleWithYou.length ? (
            peopleWithYou.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-900">
                      {p.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {p.name || p.username}
                  </div>
                  <div className="text-xs text-gray-500">@{p.username}</div>
                </div>
                {selected.has(p.id) && (
                  <Check className="w-4 h-4 text-purple-600" />
                )}
              </button>
            ))
          ) : (
            <div className="p-4 text-gray-500">No members found.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2 text-gray-900">
          <button onClick={onClose} className="px-4 py-2 text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Save & lock
          </button>
        </div>
      </div>
    </div>
  );
}
