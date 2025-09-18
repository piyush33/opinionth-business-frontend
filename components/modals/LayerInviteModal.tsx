"use client";
import { useEffect, useState } from "react";
import { X, Mail, RotateCcw, Ban, Send } from "lucide-react";
import { InviteApi } from "@/utils/api";

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-4 top-16 bottom-16 md:left-1/2 md:-translate-x-1/2 md:w-[720px] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-900">
            Invite people to this layer
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <label className="block text-sm text-gray-700 font-medium">
            Email addresses
          </label>
          <textarea
            className="w-full border rounded-lg p-3 text-gray-700"
            placeholder="alice@acme.com, bob@example.com"
            rows={3}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />

          {err && (
            <div className="p-2 bg-red-100 text-red-700 rounded">{err}</div>
          )}

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending…" : "Send invites"}
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="text-sm font-medium text-gray-900 mb-2">
            Pending & recent invites
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 text-xs text-gray-600 px-3 py-2">
              <div className="col-span-5">Email</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Expires</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="max-h-64 overflow-auto divide-y">
              {loading ? (
                <div className="p-4 text-gray-500">Loading…</div>
              ) : pending.length ? (
                pending.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-12 items-center px-3 py-2 text-sm"
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">{inv.email}</span>
                    </div>
                    <div className="col-span-2 capitalize text-gray-900">
                      {inv.status}
                    </div>
                    <div className="col-span-3 text-gray-900">
                      {inv.expiresAt
                        ? new Date(inv.expiresAt).toLocaleString()
                        : "—"}
                    </div>
                    <div className="col-span-2 flex gap-2 text-gray-900">
                      {inv.status === "pending" && (
                        <>
                          <button
                            className="px-2 py-1 border rounded hover:bg-gray-50"
                            onClick={() => onResend(inv.id)}
                            title="Resend"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            className="px-2 py-1 border rounded hover:bg-gray-50"
                            onClick={() => onRevoke(inv.id)}
                            title="Revoke"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-gray-500">No invites yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
