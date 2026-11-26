"use client";
import { useEffect, useState } from "react";
import { X, Mail, RotateCcw, Ban, Send } from "lucide-react";
import { InviteApi } from "@/utils/api";
import { Window, btn, field, tag } from "@/components/app/ui";

type Invite = {
  id: number;
  scope: "org" | "layer";
  email: string;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
};

export default function LayerInviteModal({
  layerId,
  orgId,
  onClose,
}: {
  layerId: number;
  orgId: number;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [pending, setPending] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const meId = (() => {
    try {
      const raw = localStorage.getItem("profileUser");
      return raw ? JSON.parse(raw).id : null;
    } catch {
      return null;
    }
  })();

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await InviteApi.listLayer(layerId);
      setPending(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [layerId]);

  const submit = async () => {
    const list = emails
      .split(/[, \n\r\t]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!list.length || !meId) return;

    setSending(true);
    setErr("");
    try {
      await Promise.all(
        list.map((email) => InviteApi.createLayer(layerId, meId, email))
      );
      setEmails("");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to send invites");
    } finally {
      setSending(false);
    }
  };

  const onResend = async (id: number) => {
    if (!meId) return;
    try {
      await InviteApi.resend(id, meId);
      await load();
    } catch {}
  };

  const onRevoke = async (id: number) => {
    if (!meId) return;
    try {
      await InviteApi.revoke(id, meId);
      await load();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[var(--mk-ink)]/40" onClick={onClose} />
      <Window
        title="space://invite"
        className="absolute inset-x-4 top-16 bottom-16 flex flex-col md:left-1/2 md:w-[720px] md:-translate-x-1/2"
      >
        <div className="flex items-center justify-between border-b border-[var(--mk-rule)] p-4">
          <div className="text-[18px] font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
            Invite people to this layer
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-3 p-4">
          <label className={`${tag} block`}>
            Email addresses
          </label>
          <textarea
            className={field}
            placeholder="alice@acme.com, bob@example.com"
            rows={3}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />

          {err && (
            <div className="rounded-[4px] border border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] p-2 text-[14px] tracking-tight text-[var(--mk-ink)]">{err}</div>
          )}

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={sending}
              className={`${btn.primary} px-4 py-2 text-[14px]`}
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send invites"}
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className={`${tag} mb-2`}>
            Pending & recent invites
          </div>
          <div className="overflow-hidden rounded-[4px] border border-[var(--mk-ink)]">
            <div className={`${tag} grid grid-cols-12 border-b border-[var(--mk-ink)] bg-[var(--mk-paper)] px-3 py-2`}>
              <div className="col-span-5">Email</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Expires</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="max-h-64 overflow-auto">
              {loading ? (
                <div className="p-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">Loading…</div>
              ) : pending.length ? (
                pending.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-12 items-center border-b border-[var(--mk-rule)] px-3 py-2 text-[14px] tracking-tight text-[var(--mk-ink)] last:border-b-0"
                  >
                    <div className="col-span-5 flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-[var(--mk-ink-2)]" />
                      <span className="truncate">{inv.email}</span>
                    </div>
                    <div className="col-span-2 capitalize">
                      {inv.status}
                    </div>
                    <div className="col-span-3 text-[var(--mk-ink-2)]">
                      {inv.expiresAt
                        ? new Date(inv.expiresAt).toLocaleString()
                        : "—"}
                    </div>
                    <div className="col-span-2 flex gap-2">
                      {inv.status === "pending" && (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
                            onClick={() => onResend(inv.id)}
                            title="Resend"
                            aria-label="Resend invite"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
                            onClick={() => onRevoke(inv.id)}
                            title="Revoke"
                            aria-label="Revoke invite"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">No invites yet</div>
              )}
            </div>
          </div>
        </div>
        </div>
      </Window>
    </div>
  );
}
